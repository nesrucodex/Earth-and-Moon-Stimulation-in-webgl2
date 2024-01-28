// Import the Earth image
import Earth from "./assets/images/earth.jpg";
import * as glMatrix from "gl-matrix";

// HTMLCanvasElement type assertion
const canvas: HTMLCanvasElement = document.getElementById(
  "canvas"
)! as HTMLCanvasElement;

// WebGL context creation
const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
if (!gl) throw new Error("webgl2 is not supported");

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0.1, 0.1, 0.1, 1);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// Vertex Shader
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

// Fragment Shader
const fsSource = `#version 300 es
  precision mediump float;

  in vec2 vTextureCoord;
  uniform sampler2D uSampler;

  out vec4 fragColor;

  void main(void) {
    fragColor = texture(uSampler, vTextureCoord);
  }
`;

// Compile shaders
function compileShader(source: string, type: number): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Unable to create shader");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const errorInfo = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation error: ${errorInfo}`);
  }

  return shader;
}

const vertexShader = compileShader(vsSource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(fsSource, gl.FRAGMENT_SHADER);

// Create shader program
const shaderProgram = gl.createProgram();
if (!shaderProgram) throw new Error("There is a problem with shader program");
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);

if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
  console.error(
    "Shader program linking error:",
    gl.getProgramInfoLog(shaderProgram)
  );
}

gl.useProgram(shaderProgram);

// Sphere Geometry (for a simple example, you can use a hardcoded sphere)
const vertices: number[] = [];
const textureCoordinates: number[] = [];

const latitudeDivisions = 10000;
const longitudeDivisions = 25;

for (let lat = 0; lat <= latitudeDivisions; lat++) {
  const theta = (lat * Math.PI) / latitudeDivisions;
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);

  for (let lon = 0; lon <= longitudeDivisions; lon++) {
    const phi = (lon * 2 * Math.PI) / longitudeDivisions;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    const x = cosPhi * sinTheta;
    const y = cosTheta;
    const z = sinPhi * sinTheta;

    const u = 1 - lon / longitudeDivisions;
    const v = 1 - lat / latitudeDivisions;

    vertices.push(x, y, z);
    textureCoordinates.push(u, v);
  }
}

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

const textureCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array(textureCoordinates),
  gl.STATIC_DRAW
);

// Attribute and Uniform Locations
const positionAttribLocation = gl.getAttribLocation(
  shaderProgram,
  "aVertexPosition"
);
gl.enableVertexAttribArray(positionAttribLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, false, 0, 0);

const textureCoordAttribLocation = gl.getAttribLocation(
  shaderProgram,
  "aTextureCoord"
);
gl.enableVertexAttribArray(textureCoordAttribLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
gl.vertexAttribPointer(textureCoordAttribLocation, 2, gl.FLOAT, false, 0, 0);

const modelViewMatrix = glMatrix.mat4.create();
const projectionMatrix = glMatrix.mat4.create();

const modelViewMatrixLoc = gl.getUniformLocation(
  shaderProgram,
  "uModelViewMatrix"
);
const projectionMatrixLoc = gl.getUniformLocation(
  shaderProgram,
  "uProjectionMatrix"
);

glMatrix.mat4.perspective(
  projectionMatrix,
  Math.PI / 4,
  canvas.width / canvas.height,
  0.1,
  10.0
);
glMatrix.mat4.lookAt(modelViewMatrix, [0, 0, 5], [0, 0, 0], [0, 1, 0]);

gl.uniformMatrix4fv(modelViewMatrixLoc, false, modelViewMatrix);
gl.uniformMatrix4fv(projectionMatrixLoc, false, projectionMatrix);

// Load texture image
const textureImage = new Image();
textureImage.src = Earth;
textureImage.onload = () => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // Flip the image vertically
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    textureImage
  );
  gl.generateMipmap(gl.TEXTURE_2D);

  // Configure texture parameters
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  ); // Use linear mipmapping
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // Use linear filtering
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // Clamp texture in S direction
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); // Clamp texture in T direction

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 3);
};

// Define variables to keep track of rotation
let rotation = 0; // Initial rotation angle
const rotationSpeed = 0.01; // Speed of rotation
// Function to render the scene with rotation
function renderRotation() {
  // Clear the canvas
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set the camera position
  // Move the camera 10 units away from the Earth along the negative Z-axis
  glMatrix.mat4.lookAt(modelViewMatrix, [0, 0, 3], [0, 0, 0], [0, 1, 0]);

  // Update the rotation angle
  rotation += rotationSpeed;

  // Create a rotation matrix for the z-axis rotation
  const rotationMatrix = glMatrix.mat4.create();
  // glMatrix.mat4.fromZRotation(rotationMatrix, 3);
  glMatrix.mat4.fromRotation(rotationMatrix, rotation, [
    Math.PI,
    rotation,
    Math.PI,
  ]);

  // glMatrix.mat4.fromYRotation(rotationMatrix, rotation);

  // Apply rotation
  const modelViewMatrixWithRotation = glMatrix.mat4.create();
  glMatrix.mat4.multiply(
    modelViewMatrixWithRotation,
    modelViewMatrix,
    rotationMatrix
  );

  // Set the model-view matrix uniform
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, modelViewMatrixWithRotation);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 3);

  // Request the next frame
  requestAnimationFrame(renderRotation);
}

renderRotation();
