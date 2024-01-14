////////////////////////////////////////////////////////////////////////
// A WebGL program to show texture mapping on a sphere..
var gl;
var canvas;
var matrixStack = [];
var animation;
var a = 6.0;

var zAngle = 0.0;
var yAngle = 0.0;

var prevMouseX = 0.0;
var prevMouseY = 0.0;

var aPositionLocation;
var aNormalLocation;
var aTexCoordLocation;
var uMMatrixLocation;
var uVMatrixLocation;
var uPMatrixLocation;
var uWNMatrixLocation;
var uNMatrixLocation;
var uTextureLocation;
var uCubeTextureLocation;
var uEyePosLocation;

var buf;
var indexBuf;
var cubeNormalBuf;
var cubeTexBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];
var spTexCoords = [];
var spBuf;
var spIndexBuf;
var spNormalBuf;
var spTexBuf;

var sqVertices = [];
var sqIndices = [];
var sqNormals = [];
var sqTexCoords = [];
var sqVerPosBuf;
var sqVerIndexBuf;
var sqVerNormalBuf;
var sqVerTexCoordsBuf;

var objVertexPositionBuffer;
var objVertexNormalBuffer;
var objVertexIndexBuffer;

var uDiffuseTermLocation;

var uLightLocation;
var uAmbientCoeff;
var uDiffusionCoeff;
var uSpecularCoeff;
var uShineCoeff;
var uAmbientLight;
var uDiffusionLight;
var uSpecularLight;

// set up the parameters for lighting 
var light_ambient = [0.9, 0.9, 0.9, 1]; 
var light_specular = [0.9, 0.9, 0.9, 1]; 
var light_pos = [1.0, 1.5, 0, 1];   // eye space position 

var mat_ambient = [0.1, 0.1, 0.1, 1]; 
var mat_diffuse= [0.9, 0.9, 0.9, 1]; 
var mat_specular = [0.9, 0.9, 0.9, 1]; 
var mat_shine = [40];

var cubemapTexture;

var cubeMapPath = "Images/";
var posx, posy, posz, negx, negy, negz, rcube, wood_texture;
var posx_file = cubeMapPath.concat("posx.jpg");
var posy_file = cubeMapPath.concat("posy.jpg");
var posz_file = cubeMapPath.concat("posz.jpg");
var negx_file = cubeMapPath.concat("negx.jpg");
var negy_file = cubeMapPath.concat("negy.jpg");
var negz_file = cubeMapPath.concat("negz.jpg");
var rcube_file = cubeMapPath.concat("rcube.png");
var wood_texture_file = cubeMapPath.concat("wood_texture.jpg");

var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix
var wnMatrix = mat4.create(); // world normal matrix
var nMatrix = mat4.create();  //normal matrix

var eyePos = [0.0, 2.2, 8];

// Inpur JSON model file to load
input_JSON = "teapot.json";


//////////////////////////////////////////////////////////////////////////
const vertexShaderCode1 = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uNMatrix; 
uniform mat4 uWNMatrix;

out vec3 v_worldPosition;
out vec3 v_worldNormal;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;

  v_worldPosition = mat3(uMMatrix)*aPosition;
  v_worldNormal = mat3(uWNMatrix)*aNormal;

  // calculate clip space position
  gl_Position =  projectionModelView * vec4(aPosition,1.0);
  gl_PointSize=3.0;
}`;

const fragShaderCode1 = `#version 300 es
precision mediump float;

in vec3 v_worldPosition;
in vec3 v_worldNormal;

uniform vec3 eyePosWorld;
uniform samplerCube imageCubeTexture;

out vec4 fragColor;
uniform vec4 diffuseTerm;

void main() {
  vec3 worldNormal = normalize(v_worldNormal);
  vec3 eyeToSurfaceDir = normalize(v_worldPosition-eyePosWorld);
  vec3 directionReflection = reflect(eyeToSurfaceDir, worldNormal);
  vec4 cubeMapReflectCol = texture(imageCubeTexture, directionReflection);


  fragColor = cubeMapReflectCol;
}`;

const vertexShaderCode2 = `#version 300 es
in vec3 aPosition;
in vec2 aTexCoords;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec2 fragTexCoord;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;

  // pass texture coordinate to frag shader
  fragTexCoord = aTexCoords;

  // calcuie clip space position
  gl_Position =  projectionModelView * vec4(aPosition,1.0);
}`;

const fragShaderCode2 = `#version 300 es
precision highp float;

out vec4 fragColor;
in vec2 fragTexCoord;
uniform sampler2D imageTexture;

void main() {
  fragColor = vec4(0,0,0,1);
  
  //look up texture color
  vec4 textureColor =  texture(imageTexture, fragTexCoord); 

  fragColor = textureColor;
}`;

const vertexShaderCode3 = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoords;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uNMatrix; 
uniform mat4 uWNMatrix;

out vec2 fragTexCoord;
out vec3 v_worldPosition;
out vec3 v_worldNormal;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;

  // pass texture coordinate to frag shader
  fragTexCoord = aTexCoords;
  v_worldPosition = mat3(uMMatrix)*aPosition;
  v_worldNormal = mat3(uWNMatrix)*aNormal;

  // calcuie clip space position
  gl_Position =  projectionModelView * vec4(aPosition,1.0);
}`;

const fragShaderCode3 = `#version 300 es
precision highp float;

in vec2 fragTexCoord;
in vec3 v_worldPosition;
in vec3 v_worldNormal;

out vec4 fragColor;

uniform vec3 eyePosWorld;
uniform samplerCube imageCubeTexture;
uniform sampler2D imageTexture;

void main() {
  vec3 worldNormal = normalize(v_worldNormal);
  vec3 eyeToSurfaceDir = normalize(v_worldPosition-eyePosWorld);
  vec3 directionReflection = reflect(eyeToSurfaceDir, worldNormal);
  vec4 cubeMapReflectCol = texture(imageCubeTexture, directionReflection);

  fragColor = vec4(0,0,0,1);

  //look up texture color
  vec4 textureColor =  texture(imageTexture, fragTexCoord); 

  fragColor = 0.6*textureColor + 0.6*cubeMapReflectCol;
}`;

const vertexShaderCode4 = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uNMatrix; 
uniform mat4 uWNMatrix;

out vec3 posInEyeSpace;
out vec3 normal;
out vec3 v_worldPosition;
out vec3 v_worldNormal;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;

  v_worldPosition = mat3(uMMatrix)*aPosition;
  v_worldNormal = mat3(uWNMatrix)*aNormal;
  normal = normalize(vec3(uNMatrix * vec4(aNormal, 0.0)));
  posInEyeSpace = vec3(uVMatrix * uMMatrix * vec4(aPosition, 1.0));

  // calcuie clip space position
  gl_Position =  projectionModelView * vec4(aPosition,1.0);
}`;

const fragShaderCode4 = `#version 300 es
precision mediump float;

in vec3 v_worldPosition;
in vec3 v_worldNormal;
in vec3 posInEyeSpace;
in vec3 normal;

uniform mat4 uMMatrix;
uniform mat4 uVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNMatrix;
uniform mat4 uWNMatrix; 

out vec4 fragColor;

uniform vec4 lightPos; 
uniform vec4 ambientCoeff;
uniform vec4 diffuseCoeff;
uniform vec4 specularCoeff;
uniform float matShininess;  
uniform vec4 lightAmbient; 
uniform vec4 lightDiffuse; 
uniform vec4 lightSpecular;
uniform vec3 eyePosWorld;
uniform samplerCube imageCubeTexture;
uniform sampler2D imageTexture;

void main() {
  vec3 worldNormal = normalize(v_worldNormal);
  vec3 eyeToSurfaceDir = normalize(v_worldPosition-eyePosWorld);
  vec3 directionReflection = reflect(eyeToSurfaceDir, worldNormal);
  vec4 cubeMapReflectCol = texture(imageCubeTexture, directionReflection);

  vec3 lightPosInEyeSpace = vec3(lightPos);
  vec3 lightVector = normalize(vec3(lightPosInEyeSpace - posInEyeSpace)); 
  vec3 reflectionVector = normalize(vec3(reflect(-lightVector, normal))); 
  vec3 viewVector = normalize(-vec3(posInEyeSpace));

  vec4 ambient = ambientCoeff * lightAmbient; 

  float ndotl = max(dot(normal, lightVector), 0.0); 
  vec4 diffuse = diffuseCoeff * lightDiffuse * ndotl;

  float rdotv = max(dot(reflectionVector, viewVector), 0.0);
  vec4 specular;  
  if (ndotl > 0.0) 
    specular = specularCoeff * lightSpecular * pow(rdotv, matShininess); 
  else
    specular = vec4(0, 0, 0, 1); 
  fragColor = ambient+diffuse+specular;
  fragColor += 0.8*cubeMapReflectCol;
}`;

const vertexShaderCode5 = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uNMatrix; 
uniform mat4 uWNMatrix;

out vec3 v_worldPosition;
out vec3 v_worldNormal;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;

  v_worldPosition = mat3(uMMatrix)*aPosition;
  v_worldNormal = mat3(uWNMatrix)*aNormal;

  // calculate clip space position
  gl_Position =  projectionModelView * vec4(aPosition,1.0);
  gl_PointSize=3.0;
}`;

// Fragment shader code
const fragShaderCode5 = `#version 300 es
precision mediump float;

in vec3 v_worldPosition;
in vec3 v_worldNormal;

uniform vec3 eyePosWorld;
uniform samplerCube imageCubeTexture;

out vec4 fragColor;
uniform vec4 diffuseTerm;

void main() {
  vec3 worldNormal = normalize(v_worldNormal);
  vec3 eyeToSurfaceDir = normalize(v_worldPosition-eyePosWorld);
  vec3 directionReflection = refract(eyeToSurfaceDir, worldNormal, 0.7);
  vec4 cubeMapReflectCol = texture(imageCubeTexture, directionReflection);


  fragColor = cubeMapReflectCol;
}`;

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders(vertexShaderCode, fragShaderCode) {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  // attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  // check for compiiion and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  //finally use the program.
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    gl.viewportWidth = canvas.width; // the width of the canvas
    gl.viewportHeight = canvas.height; // the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

function initTextures(textureFile) {
  var tex = gl.createTexture();
  tex.image = new Image();
  tex.image.src = textureFile;
  tex.image.onload = function () {
    handleTextureLoaded(tex);
  };
  return tex;
}

function handleTextureLoaded(texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0); // use it to flip Y if needed
  gl.texImage2D(
    gl.TEXTURE_2D, // 2D texture
    0, // mipmap level
    gl.RGB, // internal format
    gl.RGB, // format
    gl.UNSIGNED_BYTE, // type of data
    texture.image // array or <img>
  );

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );

  drawScene();
}

function initCubeMap(){
  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: posx_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: negx_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: posy_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: negy_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: posz_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: negz_file,
    },
  ];
  cubeMapTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
  faceInfos.forEach((faceInfo) => {
    const { target, url } = faceInfo;
    // setup each face
    gl.texImage2D(
      target,
      0,
      gl.RGBA,
      512,
      512,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    // load images
    const image = new Image();
    image.src = url;
    image.addEventListener("load", function(){
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      drawScene();
    });
  });
  // uses mipmap for texturing
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(
    gl.TEXTURE_CUBE_MAP,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
}

// New sphere initialization function
function initSphere(nslices, nstacks, radius) {
  for (var i = 0; i <= nslices; i++) {
    var angle = (i * Math.PI) / nslices;
    var comp1 = Math.sin(angle);
    var comp2 = Math.cos(angle);

    for (var j = 0; j <= nstacks; j++) {
      var phi = (j * 2 * Math.PI) / nstacks;
      var comp3 = Math.sin(phi);
      var comp4 = Math.cos(phi);

      var xcood = comp4 * comp1;
      var ycoord = comp2;
      var zcoord = comp3 * comp1;
      var utex = 1 - j / nstacks;
      var vtex = 1 - i / nslices;

      spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
      spNormals.push(xcood, ycoord, zcoord);
      spTexCoords.push(utex, vtex);
    }
  }

  // now compute the indices here
  for (var i = 0; i < nslices; i++) {
    for (var j = 0; j < nstacks; j++) {
      var id1 = i * (nstacks + 1) + j;
      var id2 = id1 + nstacks + 1;

      spIndicies.push(id1, id2, id1 + 1);
      spIndicies.push(id2, id2 + 1, id1 + 1);
    }
  }
}

function initSphereBuffer() {
  var nslices = 50;
  var nstacks = 50;
  var radius = 1.0;

  initSphere(nslices, nstacks, radius);

  // buffer for vertices
  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = spVerts.length / 3;

  // buffer for indices
  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = spIndicies.length;

  // buffer for normals
  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = spNormals.length / 3;

  // buffer for texture coordinates
  spTexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spTexCoords), gl.STATIC_DRAW);
  spTexBuf.itemSize = 2;
  spTexBuf.numItems = spTexCoords.length / 2;
}

function drawSphere(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    spBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    spNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    spTexBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

	gl.uniform4f(uLightLocation, light_pos[0], light_pos[1], light_pos[2], light_pos[3]); 	
	gl.uniform4f(uAmbientCoeff, mat_ambient[0], mat_ambient[1], mat_ambient[2], 1.0); 
	gl.uniform4f(uDiffusionCoeff, mat_diffuse[0], mat_diffuse[1], mat_diffuse[2], 1.0); 
	gl.uniform4f(uSpecularCoeff, mat_specular[0], mat_specular[1], mat_specular[2], 1.0); 
	gl.uniform1f(uShineCoeff, mat_shine[0]); 
	gl.uniform4fv(uAmbientLight, color); 
	gl.uniform4fv(uDiffusionLight, color); 
	gl.uniform4f(uSpecularLight, light_specular[0], light_specular[1], light_specular[2], 1.0);
  gl.uniform3fv(uEyePosLocation, eyePos);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uNMatrixLocation, false, nMatrix);
  gl.uniformMatrix4fv(uWNMatrixLocation, false, wnMatrix);

  // for texture binding
  gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture); // bind the texture object to the texture unit
  gl.uniform1i(uCubeTextureLocation, 1); // pass the texture unit to the shader

  gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

// New square initialization function
function initSquare(){
  sqVertices = [
    0.5,  0.5,  0,
    -0.5,  0.5,  0, 
    - 0.5, -0.5, 0,
    0.5, -0.5,  0,
    ];
  sqIndices = [0,1,2, 0,2,3];   
  sqNormals = [
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    ];    
  sqTexCoords = [0.0,0.0,1.0,0.0,1.0,1.0,0.0,1.0]; 
}

function initSquareBuffer(){
  initSquare(); 
  sqVerPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVerPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sqVertices), gl.STATIC_DRAW);
  sqVerPosBuf.itemSize = 3;
  sqVerPosBuf.numItems = 4;

  sqVerNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVerNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sqNormals), gl.STATIC_DRAW);
  sqVerNormalBuf.itemSize = 3;
  sqVerNormalBuf.numItems = 4; 

  sqVerTexCoordsBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVerTexCoordsBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sqTexCoords), gl.STATIC_DRAW);
  sqVerTexCoordsBuf.itemSize = 2;
  sqVerTexCoordsBuf.numItems = 4; 

  sqVerIndexBuf = gl.createBuffer();	
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVerIndexBuf); 
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sqIndices), gl.STATIC_DRAW);  
  sqVerIndexBuf.itemsize = 1;
  sqVerIndexBuf.numItems = 6;  
}

function drawSquare(color){
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVerPosBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    sqVerPosBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, sqVerNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    sqVerNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, sqVerTexCoordsBuf);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    sqVerTexCoordsBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // Draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVerIndexBuf);

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uWNMatrixLocation, false, wnMatrix);

  gl.drawElements(gl.TRIANGLES, sqVerIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

// New object initialization function
function initObject() {
  // XMLHttpRequest objects are used to interact with servers
  // It can be used to retrieve any type of data, not just XML.
  var request = new XMLHttpRequest();
  request.open("GET", input_JSON);
  // MIME: Multipurpose Internet Mail Extensions
  // It lets users exchange different kinds of data files
  request.overrideMimeType("application/json");
  request.onreadystatechange = function () {
    //request.readyState == 4 means operation is done
    if (request.readyState == 4) {
      processObject(JSON.parse(request.responseText));
    }
  };
  request.send();
}

function processObject(objData) {
  objVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(objData.vertexPositions),
    gl.STATIC_DRAW
  );
  objVertexPositionBuffer.itemSize = 3;
  objVertexPositionBuffer.numItems = objData.vertexPositions.length / 3;

  objVertexNormalBuffer =  gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,  objVertexNormalBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(objData.vertexNormals),
    gl.STATIC_DRAW
  );
  objVertexNormalBuffer.itemSize = 3;
  objVertexNormalBuffer.numItems = objData.vertexNormals.length / 3;

  objVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(objData.indices),
    gl.STATIC_DRAW
  );
  objVertexIndexBuffer.itemSize = 1;
  objVertexIndexBuffer.numItems = objData.indices.length;

  drawScene();
}

function drawObject(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    objVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
  gl.vertexAttribPointer(
    aNormalLocation,
    objVertexNormalBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);

  gl.uniform4fv(uDiffuseTermLocation, color);
  gl.uniform3fv(uEyePosLocation, eyePos);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uWNMatrixLocation, false, wnMatrix);

  // for texture binding
  gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture); // bind the texture object to the texture unit
  gl.uniform1i(uCubeTextureLocation, 1); // pass the texture unit to the shader

  gl.drawElements(
    gl.TRIANGLES,
    objVertexIndexBuffer.numItems,
    gl.UNSIGNED_INT,
    0
  );
}

// New cube initialization function
function initCubeBuffer() {
  var vertices = [
    // Front face
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Back face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    // Top face
    -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Bottom face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    // Right face
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
    // Left face
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  ];
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  buf.itemSize = 3;
  buf.numItems = vertices.length / 3;

  var normals = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // Back face
    0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
    // Top face
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // Bottom face
    0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
    // Right face
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    // Left face
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];
  cubeNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  cubeNormalBuf.itemSize = 3;
  cubeNormalBuf.numItems = normals.length / 3;

  var texCoords = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Back face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Top face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Bottom face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Right face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Left face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
  ];
  cubeTexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  cubeTexBuf.itemSize = 2;
  cubeTexBuf.numItems = texCoords.length / 2;

  var indices = [
    0,
    1,
    2,
    0,
    2,
    3, // Front face
    4,
    5,
    6,
    4,
    6,
    7, // Back face
    8,
    9,
    10,
    8,
    10,
    11, // Top face
    12,
    13,
    14,
    12,
    14,
    15, // Bottom face
    16,
    17,
    18,
    16,
    18,
    19, // Right face
    20,
    21,
    22,
    20,
    22,
    23, // Left face
  ];
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  indexBuf.itemSize = 1;
  indexBuf.numItems = indices.length;
}

function drawCube(color){
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(
    aPositionLocation,
    buf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    cubeNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    cubeTexBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // Draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

	// gl.uniform4f(uLightLocation, light_pos[0], light_pos[1], light_pos[2], light_pos[3]); 	
	// gl.uniform4f(uAmbientCoeff, mat_ambient[0], mat_ambient[1], mat_ambient[2], 1.0); 
	// gl.uniform4f(uDiffusionCoeff, mat_diffuse[0], mat_diffuse[1], mat_diffuse[2], 1.0); 
	// gl.uniform4f(uSpecularCoeff, mat_specular[0], mat_specular[1], mat_specular[2], 1.0); 
	// gl.uniform1f(uShineCoeff, mat_shine[0]);
	// gl.uniform4fv(uAmbientLight, color); 
	// gl.uniform4fv(uDiffusionLight, color); 
	// gl.uniform4f(uSpecularLight, light_specular[0], light_specular[1], light_specular[2], 1.0);
	// gl.uniform1f(uFlagLocation, flag[0]);
  gl.uniform3fv(uEyePosLocation, eyePos);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uWNMatrixLocation, false, wnMatrix);
  gl.uniformMatrix4fv(uNMatrixLocation, false, nMatrix);

  // for texture binding
  gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture); // bind the texture object to the texture unit
  gl.uniform1i(uCubeTextureLocation, 1); // pass the texture unit to the shader

  gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawSkyBox(){
  shaderProgram = initShaders(vertexShaderCode2, fragShaderCode2);

  //get locations of attributes declared in the vertex shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uWNMatrixLocation = gl.getUniformLocation(shaderProgram, "uWNMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");

  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");
  uDiffuseTermLocation = gl.getUniformLocation(shaderProgram, "diffuseTerm");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  uCubeTextureLocation = gl.getUniformLocation(shaderProgram, "imageCubeTexture");
  uEyePosLocation = gl.getUniformLocation(shaderProgram, "eyePosWorld");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);

  // front side
  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, posz); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [0, 0, 500]);
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [1000,1000,1000]);
  color = [0.0,1.0,1.0,1.0];
  drawSquare(color);
  mMatrix = popMatrix(matrixStack);

  // back side
  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, negz); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [0, 0, -500]);
  mMatrix = mat4.scale(mMatrix, [1000,1000,1000]);
  color = [0.0,1.0,1.0,1.0];
  drawSquare(color);
  mMatrix = popMatrix(matrixStack);

  // right side
  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, posx); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [500,0,0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-90), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [1000,1000,1000]);
  color = [0.0,1.0,1.0,1.0];
  drawSquare(color);
  mMatrix = popMatrix(matrixStack);

  // left side
  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, negx); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [-500,0,0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [1000,1000,1000]);
  color = [0.0,1.0,1.0,1.0];
  drawSquare(color);
  mMatrix = popMatrix(matrixStack);

  // top side
  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, posy); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [0,500,0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(90), [1, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [1000,1000,1000]);
  color = [0.0,1.0,1.0,1.0];
  drawSquare(color);
  mMatrix = popMatrix(matrixStack);

  // bottom side
  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, negy); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [0,-500,0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-90), [1, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [1000,1000,1000]);
  color = [0.0,1.0,1.0,1.0];
  drawSquare(color);
  mMatrix = popMatrix(matrixStack);
}

function drawGreenSphere(){
  shaderProgram = initShaders(vertexShaderCode4, fragShaderCode4);

  //get locations of attributes declared in the vertex shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uWNMatrixLocation = gl.getUniformLocation(shaderProgram, "uWNMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");

  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");
  uDiffuseTermLocation = gl.getUniformLocation(shaderProgram, "diffuseTerm");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  uCubeTextureLocation = gl.getUniformLocation(shaderProgram, "imageCubeTexture");
  uEyePosLocation = gl.getUniformLocation(shaderProgram, "eyePosWorld");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.38, 2.0]);
  mMatrix = mat4.scale(mMatrix, [0.45, 0.45, 0.45]);
  drawSphere([20/255, 90/255, 50/255,1.0], [0.0], cubeMapTexture);
  mMatrix = popMatrix(matrixStack);
}

function drawRubicCube(){
  shaderProgram = initShaders(vertexShaderCode2, fragShaderCode2);

  //get locations of attributes declared in the vertex shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uWNMatrixLocation = gl.getUniformLocation(shaderProgram, "uWNMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");

  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");
  uDiffuseTermLocation = gl.getUniformLocation(shaderProgram, "diffuseTerm");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  uCubeTextureLocation = gl.getUniformLocation(shaderProgram, "imageCubeTexture");
  uEyePosLocation = gl.getUniformLocation(shaderProgram, "eyePosWorld");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);

  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, rcube); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit

  // transformations
  mMatrix = mat4.translate(mMatrix, [1.2, -0.4, 1.5]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-90), [1, 0, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [0.6, 0.6, 0.6]);
  drawCube([1.0,1.0,1.0,1.0], [1.0]);
  mMatrix = popMatrix(matrixStack);
}

function drawBlueSphere(){
  shaderProgram = initShaders(vertexShaderCode4, fragShaderCode4);

  //get locations of attributes declared in the vertex shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uWNMatrixLocation = gl.getUniformLocation(shaderProgram, "uWNMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");

  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");
  uDiffuseTermLocation = gl.getUniformLocation(shaderProgram, "diffuseTerm");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  uCubeTextureLocation = gl.getUniformLocation(shaderProgram, "imageCubeTexture");
  uEyePosLocation = gl.getUniformLocation(shaderProgram, "eyePosWorld");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.translate(mMatrix, [2.0, -0.4, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.35, 0.35, 0.35]);
  drawSphere([0, 0, 1, 1.0]);
  mMatrix = popMatrix(matrixStack);
}

function drawRefractedCube(){
  shaderProgram = initShaders(vertexShaderCode5, fragShaderCode5);

  //get locations of attributes declared in the vertex shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uWNMatrixLocation = gl.getUniformLocation(shaderProgram, "uWNMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");

  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");
  uDiffuseTermLocation = gl.getUniformLocation(shaderProgram, "diffuseTerm");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  uCubeTextureLocation = gl.getUniformLocation(shaderProgram, "imageCubeTexture");
  uEyePosLocation = gl.getUniformLocation(shaderProgram, "eyePosWorld");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);

  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture); // bind the texture object to the texture unit
  gl.uniform1i(uCubeTextureLocation, 1);; // pass the texture unit
  // transformations
  mMatrix = mat4.rotate(mMatrix, degToRad(15), [0, 1, 0]);
  mMatrix = mat4.translate(mMatrix, [-1.8, -0.1, 1.4]);
  mMatrix = mat4.scale(mMatrix, [0.6, 1.5, 0.6]);
  drawCube([1.0,1.0,1.0,1.0]);
  mMatrix = popMatrix(matrixStack);
}

function drawTableTop(){
  shaderProgram = initShaders(vertexShaderCode3, fragShaderCode3);

  //get locations of attributes declared in the vertex shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uWNMatrixLocation = gl.getUniformLocation(shaderProgram, "uWNMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");

  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");
  uDiffuseTermLocation = gl.getUniformLocation(shaderProgram, "diffuseTerm");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  uCubeTextureLocation = gl.getUniformLocation(shaderProgram, "imageCubeTexture");
  uEyePosLocation = gl.getUniformLocation(shaderProgram, "eyePosWorld");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);


  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, wood_texture); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [0, -1.0, 0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(-90), [1, 0, 0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [3.3, 0.3, 3.3]);
  drawSphere([1.0,1.0,1.0,1.0]);
  mMatrix = popMatrix(matrixStack);
}

function drawTableLegs(){
  shaderProgram = initShaders(vertexShaderCode3, fragShaderCode3);

  //get locations of attributes declared in the vertex shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uWNMatrixLocation = gl.getUniformLocation(shaderProgram, "uWNMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");

  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");
  uDiffuseTermLocation = gl.getUniformLocation(shaderProgram, "diffuseTerm");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  uCubeTextureLocation = gl.getUniformLocation(shaderProgram, "imageCubeTexture");
  uEyePosLocation = gl.getUniformLocation(shaderProgram, "eyePosWorld");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);

  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, wood_texture); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [-2, -2.4, 2.0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(-90), [1, 0, 0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [0.25,3,0.25]);
  drawCube([1.0,1.0,1.0,1.0]);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, wood_texture); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [2, -2.4, 2.0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(-90), [1, 0, 0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [0.25,3,0.25]);
  drawCube([1.0,1.0,1.0,1.0]);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, wood_texture); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [-2, -2.4, -2.0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(-90), [1, 0, 0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [0.25,3,0.25]);
  drawCube([1.0,1.0,1.0,1.0]);
  mMatrix = popMatrix(matrixStack);

  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
  gl.bindTexture(gl.TEXTURE_2D, wood_texture); // bind the texture object
  gl.uniform1i(uTextureLocation, 0); // pass the texture unit
  // transformations
  mMatrix = mat4.translate(mMatrix, [2, -2.4, -2.0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(-90), [1, 0, 0]);
  // mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
  mMatrix = mat4.scale(mMatrix, [0.25,3,0.25]);
  drawCube([1.0,1.0,1.0,1.0]);
  mMatrix = popMatrix(matrixStack);
}

function drawTeapot(){
  shaderProgram = initShaders(vertexShaderCode1, fragShaderCode1);

  //get locations of attributes declared in the vertex shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uWNMatrixLocation = gl.getUniformLocation(shaderProgram, "uWNMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");

  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");
  uDiffuseTermLocation = gl.getUniformLocation(shaderProgram, "diffuseTerm");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  uCubeTextureLocation = gl.getUniformLocation(shaderProgram, "imageCubeTexture");
  uEyePosLocation = gl.getUniformLocation(shaderProgram, "eyePosWorld");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);

  pushMatrix(matrixStack, mMatrix);
  color = [0.7, 0.2, 0.2, 1.0];
  mMatrix = mat4.translate(mMatrix, [0,0.24,0]);
  mMatrix = mat4.scale(mMatrix, [0.12, 0.12, 0.12]);
  drawObject(color);
  mMatrix = popMatrix(matrixStack);
}
//////////////////////////////////////////////////////////////////////
//The main drawing routine
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  // stop the current loop of animation
  if (animation) {
    window.cancelAnimationFrame(animation);
  }

  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);


  var animate = function () {
    //set up the model matrix
    mat4.identity(mMatrix);

    // set up the view matrix, multiply into the modelview matrix
    mat4.identity(vMatrix);
    eyePos[0] = 6*Math.sin(zAngle);
    eyePos[2] = 6*Math.cos(zAngle);
    vMatrix = mat4.lookAt(eyePos, [0, 0, 0], [0, 1, 0], vMatrix);

    //set up projection matrix
    mat4.identity(pMatrix);
    mat4.perspective(60, 1.0, 0.01, 1000, pMatrix);

    // mMatrix = mat4.rotate(mMatrix, degToRad(yAngle), [1, 0, 0]);
    // mMatrix = mat4.rotate(mMatrix, degToRad(zAngle), [0, 1, 0]);

    mat4.identity(wnMatrix);
    wnMatrix = mat4.multiply(wnMatrix, mMatrix);
    wnMatrix = mat4.inverse(wnMatrix);
    wnMatrix = mat4.transpose(wnMatrix);

    //set up the normal matrix
    mat4.identity(nMatrix); 
    nMatrix = mat4.multiply(nMatrix, vMatrix);
    nMatrix = mat4.multiply(nMatrix, mMatrix); 	
    nMatrix = mat4.inverse(nMatrix);
    nMatrix = mat4.transpose(nMatrix);

    zAngle -= 0.005

    drawSkyBox();
    drawRubicCube();
    drawTeapot();
    drawTableTop();
    drawTableLegs();
    drawBlueSphere();
    drawGreenSphere();
    drawRefractedCube();
    animation = window.requestAnimationFrame(animate);
  };
  animate();

}

function onMouseDown(event) {
  document.addEventListener("mousemove", onMouseMove, false);
  document.addEventListener("mouseup", onMouseUp, false);
  document.addEventListener("mouseout", onMouseOut, false);

  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    prevMouseX = event.clientX;
    prevMouseY = canvas.height - event.clientY;
  }
}

function onMouseMove(event) {
  // make mouse interaction only within canvas
  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX = mouseX - prevMouseX;
    zAngle = zAngle + diffX / 100;
    prevMouseX = mouseX;

    var mouseY = canvas.height - event.clientY;
    var diffY = mouseY - prevMouseY;
    yAngle = yAngle - diffY / 100;
    prevMouseY = mouseY;

    drawScene();
  }
}

function onMouseUp(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("assignment3");
  document.addEventListener("mousedown", onMouseDown, false);

  initGL(canvas);

  //initialize buffers for the square
  initObject();
  initSquareBuffer();
  initCubeBuffer();
  initSphereBuffer();
  initCubeMap();

  posx = initTextures(posx_file);
  posy = initTextures(posy_file);
  posz = initTextures(posz_file);
  negx = initTextures(negx_file);
  negy = initTextures(negy_file);
  negz = initTextures(negz_file);
  rcube = initTextures(rcube_file);
  wood_texture = initTextures(wood_texture_file);

  drawScene();
}
