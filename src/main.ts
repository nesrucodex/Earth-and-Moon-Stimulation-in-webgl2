// Import necessary dependencies
import { mat4 } from "gl-matrix";
import Earth from "./assets/images/earth.jpg";
import Moon from "./assets/images/moon.jpg";

window.addEventListener("resize", () => {
  location.reload();
});
// Define vertex shader source code
const vsSource = `#version 300 es
    in vec4 aVertexPosition;
    in vec2 aTextureCoord;

    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    out vec2 vTextureCoord;

    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
    }
`;

// Define fragment shader source code
const fsSource = `#version 300 es
    precision highp float;

    in vec2 vTextureCoord;
    out vec4 fragColor;
    uniform sampler2D uSampler;

    void main(void) {
        fragColor = texture(uSampler, vTextureCoord);
    }
`;

// Initialize WebGL
function initWebGL(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    alert("Unable to initialize WebGL2. Your browser may not support it.");
    return null;
  }
  return gl;
}

// Load shader
function loadShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    alert("Error creating shader.");
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("Error compiling shader: " + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Initialize shader program
function initShaderProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram | null {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vertexShader || !fragmentShader) return null;

  const shaderProgram = gl.createProgram();
  if (!shaderProgram) {
    alert("Error creating shader program.");
    return null;
  }
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      "Error linking shader program: " + gl.getProgramInfoLog(shaderProgram)
    );
    return null;
  }
  return shaderProgram;
}

// Initialize buffers for a sphere
function initBuffers(gl: WebGL2RenderingContext): WebGLBuffer[] | null {
  const positions: number[] = [];
  const indices: number[] = [];
  const textureCoords: number[] = [];

  const latitudeBands = 30;
  const longitudeBands = 30;
  const radius = 1.2;

  for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
    const theta = (latNumber * Math.PI) / latitudeBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
      const phi = (longNumber * 2 * Math.PI) / longitudeBands;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;
      const u = 1 - longNumber / longitudeBands;
      const v = 1 - latNumber / latitudeBands;

      positions.push(radius * x, radius * y, radius * z);
      textureCoords.push(u, v);
    }
  }

  // ! It is making a mesh of triangles
  for (let latNumber = 0; latNumber < latitudeBands; latNumber++) {
    for (let longNumber = 0; longNumber < longitudeBands; longNumber++) {
      const first = latNumber * (longitudeBands + 1) + longNumber;
      const second = first + longitudeBands + 1;
      indices.push(first, second, first + 1, second, second + 1, first + 1);
    }
  }

  const positionBuffer = gl.createBuffer();
  const textureCoordBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  if (!positionBuffer || !textureCoordBuffer || !indexBuffer) {
    alert("Error creating buffers.");
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(textureCoords),
    gl.STATIC_DRAW
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  return [positionBuffer, textureCoordBuffer, indexBuffer];
}

// Load texture
function loadTexture(
  gl: WebGL2RenderingContext,
  url: string
): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) {
    alert("Error creating texture.");
    return null;
  }

  const image = new Image();
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  image.src = url;

  return texture;
}

// Main function
function main() {
  // Get the canvas element
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  // ! Master-piece
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // Initialize WebGL context
  const gl = initWebGL(canvas);
  if (!gl) {
    alert("Error in initalizing gl context");
    return;
  }

  // Initialize shader program
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  if (!shaderProgram) {
    alert("Error in Initialize shader program");
    return;
  }
  // Define shader program information
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
      sampler: gl.getUniformLocation(shaderProgram, "uSampler"),
    },
  };

  // Initialize buffers for a sphere
  const buffers = initBuffers(gl);
  if (!buffers) {
    alert("Error in Initialize buffers for a sphere");
    return;
  }

  // Load Earth texture
  const earthTexture = loadTexture(gl, Earth);
  if (!earthTexture) {
    alert("Error in Load Earth texture");
    return;
  }
  // Load Moon texture
  const moonTexture = loadTexture(gl, Moon);
  if (!moonTexture) {
    alert("Error in Load Moon texture");
    return;
  }

  // Render function
  function render(now: number) {
    // Convert time to seconds
    now *= 0.0005;
    const deltaTime = now;

    // Draw the scene
    gl &&
      buffers &&
      earthTexture &&
      moonTexture &&
      drawScene(gl, programInfo, buffers, earthTexture, moonTexture, deltaTime);

    // Request the next frame
    requestAnimationFrame(render);
  }

  // Start rendering
  requestAnimationFrame(render);
}

// Draw the scene
function drawScene(
  gl: WebGL2RenderingContext,
  programInfo: any,
  buffers: WebGLBuffer[],
  earthTexture: WebGLTexture,
  moonTexture: WebGLTexture,
  deltaTime: number
) {
  // Clear the canvas
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Define perspective matrix
  // const fieldOfView = (45 * Math.PI) / 180;
  const drawPlanet = (
    texture: WebGLTexture,
    translation: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => {
    const fieldOfView = Math.PI / 4;
    const aspect = gl.canvas.width / gl.canvas.height;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Define model-view matrix
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, translation);
    mat4.rotateX(modelViewMatrix, modelViewMatrix, rotation[0]);
    mat4.rotateY(modelViewMatrix, modelViewMatrix, rotation[1]);
    mat4.rotateZ(modelViewMatrix, modelViewMatrix, rotation[2]);
    mat4.scale(modelViewMatrix, modelViewMatrix, scale);

    // Use the shader program
    gl.useProgram(programInfo.program);

    // Set up the vertex position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0]);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    // Set up the texture coordinate attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[1]);
    gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    // Set the projection and model-view matrices in the shader
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix
    );
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );

    // Bind the Earth texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.sampler, 0);

    // Draw the Earth
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers[2]);
    gl.drawElements(gl.TRIANGLES, 6 * 30 * 30, gl.UNSIGNED_SHORT, 0);
  };

  let radiusOfRotation = 2.5;
  const x = Math.sin(deltaTime) * radiusOfRotation;
  const z = Math.cos(deltaTime) * radiusOfRotation - 5;

  drawPlanet(
    earthTexture,
    [0.0, 0.0, -6.0],
    [deltaTime / 1.5, 0.0, deltaTime / 1.5],
    [1, 1, 1]
  );
  drawPlanet(
    moonTexture,
    [x, 0.3, z],
    [deltaTime / 2, 0.0, deltaTime / 2],
    [0.4, 0.4, 0.4]
  );
}

main();
