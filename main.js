

    var gl;
    var tracer = {};

    //necessary extensions
    var OES_texture_float;
    var OES_texture_float_linear;
    var OES_texture_half_float;
    var OES_texture_half_float_linear;
    var OES_standard_derivatives;
    var WEBGL_draw_buffers;
    var WEBGL_depth_texture;


   // shader programs
    var poolProg;
    var skyProg;
    var waterProg = [];
    var heightProg;
    var causticProg;
    var normalProg;
    var simulateProg;
    var objProg;
    var objectProg;
    var depthProg;
    var windProg;
    var godrayProg;
    
    //rendering
    var framebuffer;
    var renderbuffer;
    var framebuffer1;
    var renderbuffer1;
    var textureSize = 256;
    var textureSize1 = 512;
    var textureSize2 = 1024;

    // matrices
    var mvMatrix = mat4.create();
    var mvMatrixStack = [];
    var pMatrix = mat4.create();
    var nmlMatrix = mat4.create();
    var lightMatrix = mat4.create();   //matrix for light
    var eyePos;
    var radius = 4.0;
    var azimuth = 0.5*Math.PI;
    var elevation = 0.5;
    var fov = 45.0;
    var eye = sphericalToCartesian(radius, azimuth, elevation);
    var center = [0.0, 0.0, 0.0];
    var up = [0.0, 1.0, 0.0];
    var view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    //fps
    var numFramesToAverage = 16;
    var frameTimeHistory = [];
    var frameTimeIndex = 0;
    var totalTimeForFrames = 0;
    var then = Date.now() / 1000;

    // animating 
    var accumTime = 0;
    var isWindy = true;

    //mouse interaction
    var time = 0;
    var mouseLeftDown = false;
    var mouseRightDown = false;
    var lastMouseX = null;
    var lastMouseY = null;

    var preHit = vec3.create(0.0);
   //var nxtHit = vec3.create(0.0);
    var viewportNormal = vec3.create(0.0);
    var mode = 0;   // 0- mouse click interaction, 1-sphere interaction


    var pool = {};    //a cube without top plane
    var sky = {};    //a cube
    var water = {};   //a plane
    var quad = {};
    var sphere = {};
    var objRaw;     //raw primitive data for obj loading
    var objModel;    //processed gl object data for obj
    var depthModel = {};   //put all necessary vbo, ibo info into this object, for drawing depth

    var depthTexture;
    var colorTexture;
    var lightInvDir = vec3.normalize(vec3.create([0.5,1.2,0.3]));

    var perm  = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
                140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
                247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
                57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
                74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
                60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
                65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
                200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
                52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
                207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
                119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
                129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
                218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
                81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
                184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
                222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180 ];

    // var grad = [  [1,1,0],    [-1,1,0],    [1,-1,0],    [-1,-1,0],
    //               [1,0,1],    [-1,0,1],    [1,0,-1],    [-1,0,-1],
    //               [0,1,1],    [0,-1,1],    [0,1,-1],    [0,-1,-1],
    //               [1,1,0],    [0,-1,1],    [-1,1,0],    [0,-1,-1] ];

    var grad = [  1,1,0,    -1,1,0,    1,-1,0,    -1,-1,0,
                  1,0,1,    -1,0,1,    1,0,-1,    -1,0,-1,
                  0,1,1,    0,-1,1,    0,1,-1,    0,-1,-1,
                  1,1,0,    0,-1,1,    -1,1,0,    0,-1,-1 ];

    var permTexture;
    var gradTexture;

    //user input
    var u_CausticOnLocation;
    var isSphere;
    var sphereRadius;
    var currentPoolPattern;

    function sphericalToCartesian( r, a, e ) {
        var x = r * Math.cos(e) * Math.cos(a);
        var y = r * Math.sin(e);
        var z = r * Math.cos(e) * Math.sin(a);

        return [x,y,z];
    }

    function initGL(canvas) {
        try {
            gl = canvas.getContext("experimental-webgl");
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
        } catch (e) {
        }
        if (!gl) {
            alert("Initializing WebGL failed.");
        }
    }


    function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    window.onload = function() {
        var gui = new dat.GUI();
        gui.add(parameters, 'Caustic');
        gui.add(parameters, 'Wind');
        gui.add(parameters, 'Object', [ 'sphere', 'mesh']);
        gui.add(parameters, 'Pool_Pattern', ['white brick', 'marble', 'blue tile', 'golden tile']);
        gui.add(parameters, 'Sphere_Radius', 0.1, 0.5); 
    };

    var parameters = new function(){
        this.Caustic = true;

        this.Object = "sphere";
        this.Pool_Pattern = "white brick";
        this.Sphere_Radius = 0.25;        
        this.Wind = true;
    }


    function initShaders() {
     //-----------------------pool------------------------------
        poolProg = gl.createProgram();
        gl.attachShader(poolProg, getShader(gl, "pool-vs") );
        gl.attachShader( poolProg, getShader(gl, "pool-fs") );
        gl.linkProgram(poolProg);

        if (!gl.getProgramParameter(poolProg, gl.LINK_STATUS)) {
            alert("Could not initialize pool shader.");
        }
        gl.useProgram(poolProg);

        poolProg.vertexPositionAttribute = gl.getAttribLocation(poolProg, "aVertexPosition");
        poolProg.textureCoordAttribute = gl.getAttribLocation(poolProg, "aTextureCoord");
        poolProg.vertexNormalAttribute = gl.getAttribLocation(poolProg, "aVertexNormal");

        poolProg.pMatrixUniform = gl.getUniformLocation(poolProg, "uPMatrix");
        poolProg.mvMatrixUniform = gl.getUniformLocation(poolProg, "uMVMatrix");
        poolProg.nmlMatrixUniform = gl.getUniformLocation(poolProg, "uNmlMatrix");
        poolProg.lightMatrixUniform = gl.getUniformLocation(poolProg, "uLightMatrix");
        poolProg.samplerTileUniform = gl.getUniformLocation(poolProg, "uSamplerTile");
        poolProg.samplerWaterUniform = gl.getUniformLocation(poolProg, "uSamplerWater");
        poolProg.samplerCausticUniform = gl.getUniformLocation(poolProg, "uSamplerCaustic");
        poolProg.samplerDepthUniform = gl.getUniformLocation(poolProg, "uSamplerDepth");
        poolProg.sphereRadiusUniform = gl.getUniformLocation(poolProg, "uSphereRadius");
        poolProg.sphereCenterUniform = gl.getUniformLocation(poolProg, "uSphereCenter");
        poolProg.causticOnUniform = gl.getUniformLocation(poolProg, "uCausticOn");



        //-----------------------sphere------------------------------
        objProg = gl.createProgram();
        gl.attachShader(objProg, getShader(gl, "obj-vs") );
        gl.attachShader(objProg, getShader(gl, "obj-fs") );
        gl.linkProgram(objProg);

        if (!gl.getProgramParameter(objProg, gl.LINK_STATUS)) {
            alert("Could not initialize obj shader.");
        }
        gl.useProgram(objProg);

        objProg.vertexPositionAttribute = gl.getAttribLocation(objProg, "aVertexPosition");
       // objProg.textureCoordAttribute = gl.getAttribLocation(objProg, "aTextureCoord");
        objProg.vertexNormalAttribute = gl.getAttribLocation(objProg, "aVertexNormal");

        objProg.pMatrixUniform = gl.getUniformLocation(objProg, "uPMatrix");
        objProg.mvMatrixUniform = gl.getUniformLocation(objProg, "uMVMatrix");
        objProg.nmlMatrixUniform = gl.getUniformLocation(objProg, "uNmlMatrix");
        objProg.CenterUniform = gl.getUniformLocation(objProg, "uCenter");
        objProg.sphereCenterUniform = gl.getUniformLocation(objProg, "uSphereCenter");
        objProg.sphereRadiusUniform = gl.getUniformLocation(objProg, "uSphereRadius");
        objProg.samplerWaterUniform = gl.getUniformLocation(objProg, "uSamplerWater");
        objProg.samplerCausticUniform = gl.getUniformLocation(objProg, "uSamplerCaustic");
        objProg.isSphereUniform = gl.getUniformLocation(objProg, "uIsSphere");
        objProg.causticOnUniform = gl.getUniformLocation(objProg, "uCausticOn");
        //objProg.RadiusUniform = gl.getUniformLocation(objProg, "uRadius");
       // objProg.diffuseColorUniform = gl.getUniformLocation(objProg, "uDiffuseColor");
       // objProg.samplerTileUniform = gl.getUniformLocation(objProg, "uSampler");

     //-----------------------sky------------------------------
        skyProg = gl.createProgram();
        gl.attachShader(skyProg, getShader(gl, "sky-vs") );
        gl.attachShader( skyProg, getShader(gl, "sky-fs") );
        gl.linkProgram(skyProg);

        if (!gl.getProgramParameter(skyProg, gl.LINK_STATUS)) {
            alert("Could not initialize sky shader.");
        }
        gl.useProgram(skyProg);

        skyProg.vertexPositionAttribute = gl.getAttribLocation(skyProg, "aVertexPosition");

        skyProg.pMatrixUniform = gl.getUniformLocation(skyProg, "uPMatrix");
        skyProg.mvMatrixUniform = gl.getUniformLocation(skyProg, "uMVMatrix");
        skyProg.samplerSkyUniform = gl.getUniformLocation(skyProg, "uSamplerSky");

        //-----------------------water---------------------------------
        for(var i=0; i<2; i++){

            waterProg[i] = gl.createProgram();
            gl.attachShader(waterProg[i], getShader(gl, "water-vs") );
            gl.attachShader(waterProg[i], getShader(gl, "water-fs") );
            gl.linkProgram(waterProg[i]);

            if (!gl.getProgramParameter(waterProg[i], gl.LINK_STATUS)) {
                alert("Could not initialize water shader.");
            }
            gl.useProgram(waterProg[i]);

            waterProg[i].vertexPositionAttribute = gl.getAttribLocation(waterProg[i], "aVertexPosition");
            waterProg[i].vertexNormalAttribute = gl.getAttribLocation(waterProg[i], "aVertexNormal");
            //waterProg.textureCoordAttribute = gl.getAttribLocation(waterProg, "aTextureCoord");

            waterProg[i].pMatrixUniform = gl.getUniformLocation(waterProg[i], "uPMatrix");
            waterProg[i].mvMatrixUniform = gl.getUniformLocation(waterProg[i], "uMVMatrix");
            waterProg[i].samplerSkyUniform = gl.getUniformLocation(waterProg[i], "uSamplerSky");
            waterProg[i].samplerTileUniform = gl.getUniformLocation(waterProg[i], "uSamplerTile");
            waterProg[i].samplerWaterUniform = gl.getUniformLocation(waterProg[i], "uSamplerWater");
            waterProg[i].samplerCausticUniform = gl.getUniformLocation(waterProg[i], "uSamplerCaustic");
            waterProg[i].eyePositionUniform = gl.getUniformLocation(waterProg[i],"uEyePosition");
            waterProg[i].nmlMatrixUniform = gl.getUniformLocation(waterProg[i], "uNmlMatrix");
            waterProg[i].progNumUniform = gl.getUniformLocation(waterProg[i], "uProgNum");
            waterProg[i].sphereCenterUniform = gl.getUniformLocation(waterProg[i], "uSphereCenter");
            waterProg[i].sphereRadiusUniform = gl.getUniformLocation(waterProg[i], "uSphereRadius");
            waterProg[i].causticOnUniform = gl.getUniformLocation(waterProg[i], "uCausticOn");
        }

        //-----------------------height------------------------------------------------
        heightProg = gl.createProgram();
        gl.attachShader(heightProg, getShader(gl, "interact-vs") );
        gl.attachShader(heightProg, getShader(gl, "interact-height-fs") );
        gl.linkProgram(heightProg);

        if (!gl.getProgramParameter(heightProg, gl.LINK_STATUS)) {
            alert("Could not initialize height shader.");
        }
        gl.useProgram(heightProg);

        heightProg.vertexPositionAttribute = gl.getAttribLocation(heightProg, "aVertexPosition");
        heightProg.samplerWaterUniform = gl.getUniformLocation(heightProg, "uSamplerWater");
        heightProg.centerUniform = gl.getUniformLocation(heightProg,"uCenter");

        //-----------------------caustic------------------------------------------------
        causticProg = gl.createProgram();
        gl.attachShader(causticProg, getShader(gl, "caustic-vs") );
        gl.attachShader(causticProg, getShader(gl, "caustic-fs") );
        gl.linkProgram(causticProg);

        if (!gl.getProgramParameter(causticProg, gl.LINK_STATUS)) {
            alert("Could not initialize caustic shader.");
        }
        gl.useProgram(causticProg);

        causticProg.samplerWaterUniform = gl.getUniformLocation(causticProg, "uSamplerWater");
        causticProg.vertexPositionAttribute = gl.getAttribLocation(causticProg, "aVertexPosition");
        causticProg.OESderivativesUniform = gl.getUniformLocation(causticProg,"OES_standard_derivatives");
        causticProg.sphereRadiusUniform = gl.getUniformLocation(causticProg, "uSphereRadius");
        causticProg.sphereCenterUniform = gl.getUniformLocation(causticProg, "uSphereCenter");

         //-----------------------normal------------------------------------------------
        normalProg = gl.createProgram();
        gl.attachShader(normalProg, getShader(gl, "interact-vs") );
        gl.attachShader(normalProg, getShader(gl, "interact-normal-fs") );
        gl.linkProgram(normalProg);

        if (!gl.getProgramParameter(normalProg, gl.LINK_STATUS)) {
            alert("Could not initialize normal shader.");
        }
        gl.useProgram(normalProg);

        normalProg.vertexPositionAttribute = gl.getAttribLocation(normalProg, "aVertexPosition");
        normalProg.samplerWaterUniform = gl.getUniformLocation(normalProg, "uSamplerWater");
        normalProg.deltaUniform = gl.getUniformLocation(normalProg,"uDelta");

        //-----------------------simulation-----------------------------------------------
        simulateProg = gl.createProgram();
        gl.attachShader(simulateProg, getShader(gl, "interact-vs") );
        gl.attachShader(simulateProg, getShader(gl, "interact-simulate-fs") );
        gl.linkProgram(simulateProg);

        if (!gl.getProgramParameter(simulateProg, gl.LINK_STATUS)) {
            alert("Could not initialize simulate shader.");
        }
        gl.useProgram(simulateProg);

        simulateProg.vertexPositionAttribute = gl.getAttribLocation(simulateProg, "aVertexPosition");
        simulateProg.samplerWaterUniform = gl.getUniformLocation(simulateProg, "uSamplerWater");
        simulateProg.deltaUniform = gl.getUniformLocation(simulateProg,"uDelta");

        //---------------------sphere interaction---------------------------------------------------
        objectProg = gl.createProgram();
        gl.attachShader(objectProg, getShader(gl, "interact-vs") );
        gl.attachShader(objectProg, getShader(gl, "interact-sphere-fs") );
        gl.linkProgram(objectProg);

        if (!gl.getProgramParameter(objectProg, gl.LINK_STATUS)) {
            alert("Could not initialize interact shader.");
        }
        gl.useProgram(objectProg);

        objectProg.vertexPositionAttribute = gl.getAttribLocation(objectProg, "aVertexPosition");
        objectProg.samplerWaterUniform = gl.getUniformLocation(objectProg, "uSamplerWater");
        objectProg.newCenterUniform = gl.getUniformLocation(objectProg, "uNewCenter");
        objectProg.oldCenterUniform = gl.getUniformLocation(objectProg,"uOldCenter");
        objectProg.radiusUniform = gl.getUniformLocation(objectProg,"uRadius");

        //---------------------obj shadow map---------------------------------------------------
        depthProg = gl.createProgram();
        gl.attachShader(depthProg, getShader(gl, "depth-vs") );
        gl.attachShader(depthProg, getShader(gl, "depth-fs") );
        gl.linkProgram(depthProg);


        if (!gl.getProgramParameter(depthProg, gl.LINK_STATUS)) {
            alert("Could not initialize shadow shader.");
        }
        gl.useProgram(depthProg);

        depthProg.vertexPositionAttribute = gl.getAttribLocation(depthProg, "aVertexPosition");
        depthProg.pMatrixUniform = gl.getUniformLocation(depthProg, "uPMatrix");
        depthProg.mvMatrixUniform = gl.getUniformLocation(depthProg, "uMVMatrix");
        depthProg.centerUniform = gl.getUniformLocation(depthProg, "uCenter");


        //---------------------perlin noise for wind------------------------------------------------
        windProg = gl.createProgram();
        gl.attachShader(windProg, getShader(gl, "perlin-vs") );
        gl.attachShader(windProg, getShader(gl, "perlin-fs") );
        gl.linkProgram(windProg);

        if (!gl.getProgramParameter(windProg, gl.LINK_STATUS)) {
            alert("Could not initialize wind shader.");
        }
        gl.useProgram(windProg);

        windProg.vertexPositionAttribute = gl.getAttribLocation(windProg, "aVertexPosition");
        windProg.samplerWaterUniform = gl.getUniformLocation(windProg, "uSamplerWater");
        windProg.samplerPermUniform = gl.getUniformLocation(windProg, "uSamplerPerm");
        windProg.samplerGradUniform = gl.getUniformLocation(windProg, "uSamplerGrad");
        windProg.timeUniform = gl.getUniformLocation(windProg, "uTime");

        //---------------------particle for rain------------------------------------------------
        windProg = gl.createProgram();
        gl.attachShader(windProg, getShader(gl, "perlin-vs") );
        gl.attachShader(windProg, getShader(gl, "perlin-fs") );
        gl.linkProgram(windProg);

        if (!gl.getProgramParameter(windProg, gl.LINK_STATUS)) {
            alert("Could not initialize wind shader.");
        }
        gl.useProgram(windProg);

        windProg.vertexPositionAttribute = gl.getAttribLocation(windProg, "aVertexPosition");
        windProg.samplerWaterUniform = gl.getUniformLocation(windProg, "uSamplerWater");
        windProg.samplerPermUniform = gl.getUniformLocation(windProg, "uSamplerPerm");
        windProg.samplerGradUniform = gl.getUniformLocation(windProg, "uSamplerGrad");
        windProg.timeUniform = gl.getUniformLocation(windProg, "uTime");
        //windProg.pMatrixUniform = gl.getUniformLocation(windProg, "uPMatrix");
        //windProg.mvMatrixUniform = gl.getUniformLocation(windProg, "uMVMatrix");

        //----------------------quad debug shader----------------------------------------------
        quadProg = gl.createProgram();
        gl.attachShader(quadProg, getShader(gl, "quad-vs"));
        gl.attachShader(quadProg, getShader(gl, "quad-fs"));
        gl.linkProgram(quadProg);

        if (!gl.getProgramParameter(quadProg, gl.LINK_STATUS)) {
            alert("Could not initialize quad shader.");
        }
        gl.useProgram(quadProg);

        quadProg.vertexPositionAttribute = gl.getAttribLocation(quadProg, "aVertexPosition");
        quadProg.samplerDepthUniform = gl.getUniformLocation(quadProg, "uSamplerDepth");
        quadProg.textureCoordAttribute = gl.getAttribLocation(quadProg, "aTextureCoord");
        
        //----------------------god rays----------------------------------------------
        godrayProg = gl.createProgram();
        gl.attachShader(godrayProg, getShader(gl, "godray-vs") );
        gl.attachShader(godrayProg, getShader(gl, "godray-fs") );
        gl.linkProgram(godrayProg);

        if (!gl.getProgramParameter(godrayProg, gl.LINK_STATUS)) {
            alert("Could not initialize godray shader.");
        }
        gl.useProgram(godrayProg);

        godrayProg.vertexPositionAttribute = gl.getAttribLocation(godrayProg, "aVertexPosition");
        godrayProg.mvMatrixUniform = gl.getUniformLocation(godrayProg, "uMVMatrix");
        godrayProg.pMatrixUniform = gl.getUniformLocation(godrayProg, "uPMatrix");
        godrayProg.lightMatrixUniform = gl.getUniformLocation(godrayProg, "uLightMatrix");
        godrayProg.samplerInputUniform = gl.getUniformLocation(godrayProg, "uSamplerInput");
        godrayProg.passUniform = gl.getUniformLocation(godrayProg, "uPass");
    }

    function checkCanDrawToTexture(texture){
        framebuffer = framebuffer || gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        var result = gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return result;

    }

    function handleLoadedTexture(texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        //gl.generateMipmap(gl.TEXTURE_2D);
       // gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function initTexture(texture, url) {
        console.log("loading texture: " + url);
        texture.image = new Image();
        texture.image.onload = function () {
            handleLoadedTexture(texture)
        }

        texture.image.src = url;
    }

    function initCustomeTexture( texture, format, filter, type, width, height, data, wrapS, wrapT){ 
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter );

        wrapS = wrapS ||gl.CLAMP_TO_EDGE;
        wrapT = wrapT ||gl.CLAMP_TO_EDGE;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT );

        data = data||null;
        if(type == gl.FLOAT){
            if(OES_texture_float){
                gl.texImage2D( gl.TEXTURE_2D, 0, format, width, height, 0, format, type, data);
            }
            else{
                alert("OES_texture_float is not enabled.");
            }
        }
        else{
            gl.texImage2D( gl.TEXTURE_2D, 0, format, width, height, 0, format, type, data);
        }
       // gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function initSkyBoxTexture() {
        var ct = 0;
        var img = new Array(6);
        var urls = [
       // "skybox/posx.jpg", "skybox/negx.jpg", 
        //   "skybox/posy.jpg", "skybox/negy.jpg", 
        //   "skybox/posz.jpg", "skybox/negz.jpg"
       // "skybox/Sky2.jpg","skybox/Sky3.jpg",
      // "skybox/Sky4.jpg","skybox/Sky5.jpg", 
      //  "skybox/Sky0.jpg","skybox/Sky1.jpg"
        "skybox/skyright.jpg","skybox/skyleft.jpg",
       "skybox/skyup.jpg","skybox/skydown.jpg", 
        "skybox/skyback.jpg","skybox/skyfront.jpg"
        ];
        for (var i = 0; i < 6; i++) {
            img[i] = new Image();
            img[i].onload = function() {
                ct++;
                if (ct == 6) {   //upon finish loading all 6 images
                    sky.Texture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, sky.Texture);
                    var targets = [
                       gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
                       gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
                       gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z ];
                    for (var j = 0; j < 6; j++) {
                      //  console.log("bingding skybox texture: " + targets[j]);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                        gl.texImage2D(targets[j], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img[j]);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    }
                    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                  
                }
            }
           // console.log("loading skybox texture: " + urls[i]);
            img[i].src = urls[i];
        }
    }
  
    function mvPushMatrix() {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);
        mvMatrixStack.push(copy);
    }

    function mvPopMatrix() {
        if (mvMatrixStack.length == 0) {
            throw "Invalid popMatrix!";
        }
        mvMatrix = mvMatrixStack.pop();
    }


    function setMatrixUniforms(prog) {
        gl.uniformMatrix4fv(prog.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(prog.mvMatrixUniform, false, mvMatrix);
    }


    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }



function initBuffers(model, primitive){
        model.VBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.VBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(primitive.vertices), gl.STATIC_DRAW);

        model.NBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.NBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(primitive.normals), gl.STATIC_DRAW);

        model.TBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, model.TBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(primitive.texcoords), gl.STATIC_DRAW);
     
        model.IBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.IBO);
       
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(primitive.indices), gl.STATIC_DRAW);
        model.IBO.numItems = primitive.numIndices;
}


function initObjs(){

    //objRaw = loadObj("objs/suzanne.obj");
   //objRaw = loadObj("objs/prism.obj");
//objRaw = loadObj("objs/apple.obj");
//objRaw = loadObj("objs/appleHighPoly.obj");
    objRaw = loadObj("objs/duck.obj");
    //objRaw = loadObj("objs/duckHighPoly.obj");

    objRaw.addCallback(function () {
        objModel = new createModel(gl, objRaw);
        var sum = 0;
        for(var i=0; i<objModel.numGroups(); i++){
            sum += objModel.numIndices(i);
        }
        // console.log ("obj created with number of indices: " + sum);
        //console.log("primitive vertices: " + objRaw.vertices(0));
          var all = {};
          all.vertices = [];
          all.indices = [];
          all.normals = [];
          all.texcoords = [];
          for(var i=0; i<cubePool.vertices.length; i++){
            all.vertices.push(cubePool.vertices[i]);
          }
          for(var i=0; i<objRaw.numGroups(); i++){
            for(var j=0; j<objRaw.vertices(i).length; j++){
                all.vertices.push(objRaw.vertices(i)[j]);
            }
          }

          for(var i=0; i<cubePool.indices.length; i++){
            all.indices.push(cubePool.indices[i]);
          }
          for(var i=0; i<objRaw.numGroups(); i++){
              for(var j=0; j<objRaw.indices(i).length; j++){
                all.indices.push(objRaw.indices(i)[j]);
            }
          }

           for(var i=0; i<cubePool.normals.length; i++){
            all.normals.push(cubePool.normals[i]);
          }
          for(var i=0; i<objRaw.numGroups(); i++){
              for(var j=0; j<objRaw.normals(i).length; j++){
                all.normals.push(objRaw.normals(i)[j]);
            }
          }

           for(var i=0; i<cubePool.texcoords.length; i++){
            all.texcoords.push(cubePool.texcoords[i]);
          }
          for(var i=0; i<objRaw.numGroups(); i++){
              for(var j=0; j<objRaw.texcoords(i).length; j++){
                all.texcoords.push(objRaw.texcoords(i)[j]);
            }
          }

          //all.numIndices = sum + cubePool.numIndices;
          all.numIndices = all.indices.length;
          initBuffers(depthModel, all);
          // console.log("pool indices: " + cubePool.numIndices);
          // console.log("obj indices: " + sum);
          // console.log("depthModel indices: " + depthModel.IBO.numItems);

         // depthModel.VBO = gl.createBuffer();
         // gl.bindBuffer(gl.ARRAY_BUFFER, depthModel.VBO);
         // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(all.vertices), gl.STATIC_DRAW);

         // depthModel.IBO = gl.createBuffer();
         // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, depthModel.IBO);
         // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(all.indices), gl.STATIC_DRAW);
         // depthModel.IBO.numItems = all.numIndices;
    });
    objRaw.executeCallBackFunc();
    registerAsyncObj(gl, objRaw);

}

   



function handleMouseDown(event) {
    if( event.button == 2 ) {
        mouseLeftDown = false;
        mouseRightDown = true;
    }
    else {
        mouseLeftDown = true;
        mouseRightDown = false;
        startInteraction(event.clientX, event.clientY);
    }
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp(event) {
    mouseLeftDown = false;
    mouseRightDown = false;
}

function handleMouseMove(event) {
    if (!(mouseLeftDown || mouseRightDown)) {
        return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX;
    var deltaY = newY - lastMouseY;
    
    if( mouseLeftDown ) {
        duringInterction(newX, newY);
        //radius += 0.01 * deltaY;
        //radius = Math.min(Math.max(radius, 2.0), 10.0);
    }
    else {
        azimuth += 0.01 * deltaX;
        elevation += 0.01 * deltaY;
        elevation = Math.min(Math.max(elevation, -Math.PI/2+0.001), Math.PI/2-0.001);
    }
    eye = sphericalToCartesian(radius, azimuth, elevation);
    view = mat4.create();
    mat4.lookAt(eye, center, up, view);

    lastMouseX = newX;
    lastMouseY = newY;
}

function handleMouseWheel(event){
        //console.log("scroll");
    var move = event.wheelDelta/240;
    
    if (move < 0 || pMatrix[14] > -2){
      //  pMatrix = mat4.translate(pMatrix, [0, 0, event.wheelDelta/240]);
    }
    if(fov+move< 90 && fov+move> 25){
        fov += move;
    }
    return false; // Don't scroll the page 
}

function startInteraction(x,y){
    initTracer();
    var ray = vec3.create();
    ray = rayEyeToPixel(x,y);

    var hit = vec3.create();
    hit = rayIntersectSphere(tracer.eye, ray, sphere.center, sphere.radius);
    if(hit!= null){   //sphere interaction
        preHit = hit;
        viewportNormal = rayEyeToPixel(gl.viewportWidth / 2.0, gl.viewportHeight / 2.0);
        vec3.negate(viewportNormal);
        mode = 1;
        // console.log("--------------hit sphere at " + vec3.str(preHit));
        // console.log("--------------viewportNormal="+vec3.str(viewportNormal));
    }
    else{   //mouse directioin interaction
        var scale = -tracer.eye[1] / ray[1];
        //move in the direction of ray, until gets the 'y=waterHeight' plane
        var point = vec3.create([tracer.eye[0] + ray[0]*scale, tracer.eye[1] + ray[1]*scale, tracer.eye[2] + ray[2]*scale] );
        if (Math.abs(point[0]) < 1 && Math.abs(point[2]) < 1) {
          drawHeight(point[0],point[2]);
          mode = 0;
        }
    }
}

function duringInterction(x,y){

    var ray = vec3.create();
    ray = rayEyeToPixel(x,y);
    if(mode == 0){   //direct mouse interaction
        var scale = -tracer.eye[1] / ray[1];
        var point = vec3.create([tracer.eye[0] + ray[0]*scale, tracer.eye[1] + ray[1]*scale, tracer.eye[2] + ray[2]*scale] );
   
        if (Math.abs(point[0]) < 1 && Math.abs(point[2]) < 1) {
          drawHeight(point[0],point[2]);
        }
    }
    //var hit = rayIntersectSphere(tracer.eye, ray, sphere.center, sphere.radius);
    //if(hit!= null){   //sphere interaction, move sphere around
    if(mode == 1){  //sphere interaction, move sphere around
        var theEye = vec3.create(tracer.eye);
        var preRay = vec3.create(preHit);
        var nxtRay = vec3.create(ray);

        vec3.subtract(preRay, theEye);   //preRay = preHit - eye
        var t1 = vec3.dot(viewportNormal, preRay);  
        var t2 = vec3.dot(viewportNormal, nxtRay);
        var t = t1/t2;
        vec3.scale(nxtRay, t);
        // console.log("-----------------------");
        // console.log("pre ray: " + vec3.str(preRay));
        // console.log("nxt ray: " + vec3.str(nxtRay));

        var nxtHit = vec3.create();
        nxtHit = vec3.add(theEye, nxtRay);
        var offsetHit = vec3.create(nxtHit);
        vec3.subtract(offsetHit, preHit);   //offsetHit = nxtHit - preHit

        // console.log("pre hit: " + vec3.str(preHit));
        // console.log("nxt hit: " + vec3.str(nxtHit));
        // console.log("hit offset: " + vec3.str(offsetHit));

        if(vec3.length(offsetHit)>0.0){   //change location
            vec3.add(sphere.center, offsetHit);
            //make sure the sphere is in the boundary of pool
            sphere.center[0] = Math.max(sphere.radius - 1.0, Math.min(1.0 - sphere.radius, sphere.center[0]));
            sphere.center[1] = Math.max(sphere.radius - 0.65 - 0.3, Math.min(10, sphere.center[1]));
            sphere.center[2] = Math.max(sphere.radius - 1.0, Math.min(1.0 - sphere.radius, sphere.center[2]));
            //console.log("drag center: " + vec3.str(sphere.center));
        }

        preHit = nxtHit;
    }

}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    mat4.perspective(fov, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    mat4.identity(mvMatrix);
    mat4.multiply(mvMatrix,view);

    mat4.inverse(mvMatrix,nmlMatrix);
    mat4.transpose(nmlMatrix,nmlMatrix);
    
    if(parameters.Caustic == true) u_CausticOnLocation = 1.0;
    else u_CausticOnLocation = 0.0;
    
    if(parameters.Object == "sphere") isSphere = 1;
    else isSphere = 0;
    if(isSphere == 1){
        sphereRadius = parameters.Sphere_Radius;
        sphereObj = createSphere(sphereRadius, 12, 12);
        initBuffers(sphere, sphereObj);
        sphere.radius = sphereObj.radius;

        //initObjs();
    }
    if(parameters.Wind == true) isWindy = true;
    else isWindy = false;
  
    if(parameters.Pool_Pattern == "white brick" && currentPoolPattern != "white brick"){
        initTexture(pool.Texture, "tile/tile3.jpg");
        currentPoolPattern = "white brick";
    }
    if(parameters.Pool_Pattern == "marble" && currentPoolPattern != "marble") {
        initTexture(pool.Texture, "tile/tile2.jpg");
        currentPoolPattern = "marble";
    }
    if(parameters.Pool_Pattern == "blue tile" && currentPoolPattern != "blue tile"){
        initTexture(pool.Texture, "tile/tile4.jpg");
        currentPoolPattern = "blue tile";
    }
    if(parameters.Pool_Pattern == "golden tile" && currentPoolPattern != "golden tile"){
        initTexture(pool.Texture, "tile/tile5.jpg");
        currentPoolPattern = "golden tile";
    }

    drawDepth();
    drawGodrayPass1();
    drawGodrayPass2();
    drawGodrayPass3();
    drawPool();
    drawSkyBox();
    if(isSphere == 1) drawObj(sphere);
    else drawObj(objModel);
    drawWater();
     
    drawNormal();
    drawSimulation();
    drawSimulation();
    drawInteraction();
    // console.log("old center: "+ vec3.str(sphere.oldcenter));
   // console.log("new center: "+ vec3.str(sphere.center));
    sphere.oldcenter = vec3.create(sphere.center);
    drawCaustic();
    if(isWindy){
       drawWind();
    }

    //g_particleSystem.draw(viewProjection, g_world, viewInverse);
    //drawQuad();   //this is the debug draw call for depth texture
}

function drawQuad(){
     gl.viewport(0, 0, textureSize1, textureSize1);
     gl.useProgram(quadProg);

     gl.bindBuffer(gl.ARRAY_BUFFER, quad.VBO);
    gl.vertexAttribPointer(quadProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(quadProg.vertexPositionAttribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, quad.TBO);
    gl.vertexAttribPointer(quadProg.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(quadProg.textureCoordAttribute);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.uniform1i(quadProg.samplerDepthUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad.IBO);
    gl.drawElements(gl.TRIANGLES, quad.IBO.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawPool(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(poolProg);

    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);   //define front face
    gl.cullFace(gl.FRONT);   //cull front facing faces

    gl.bindBuffer(gl.ARRAY_BUFFER, pool.VBO);
    gl.vertexAttribPointer(poolProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(poolProg.vertexPositionAttribute);

     gl.bindBuffer(gl.ARRAY_BUFFER, pool.NBO);
    gl.vertexAttribPointer(poolProg.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(poolProg.vertexNormalAttribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, pool.TBO);
    gl.vertexAttribPointer(poolProg.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(poolProg.textureCoordAttribute);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pool.Texture);
    gl.uniform1i(poolProg.samplerTileUniform, 0);
    
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
    gl.uniform1i(poolProg.samplerWaterUniform,2);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, water.TextureC);
    gl.uniform1i(poolProg.samplerCausticUniform, 1);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.uniform1i(poolProg.samplerDepthUniform, 3);

    setMatrixUniforms(poolProg);
    gl.uniformMatrix4fv(poolProg.nmlMatrixUniform, false, nmlMatrix);
    gl.uniformMatrix4fv(poolProg.lightMatrixUniform, false, lightMatrix);
    gl.uniform1f(poolProg.sphereRadiusUniform, sphere.radius);
    gl.uniform3fv(poolProg.sphereCenterUniform, sphere.center);
    gl.uniform1f(poolProg.causticOnUniform, u_CausticOnLocation);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pool.IBO);
    gl.drawElements(gl.TRIANGLES, pool.IBO.numItems, gl.UNSIGNED_SHORT, 0);

    gl.disable(gl.CULL_FACE);
    gl.disableVertexAttribArray(poolProg.vertexPositionAttribute);
    gl.disableVertexAttribArray(poolProg.textureCoordAttribute);
    gl.disableVertexAttribArray(poolProg.vertexNormalAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

function drawSkyBox() {

    if (sky.Texture){
       // console.log("drawing sky box", sky.IBO.numItems);
      
     //gl.enable(gl.DEPTH_TEST);
        gl.useProgram(skyProg);
      

        gl.bindBuffer(gl.ARRAY_BUFFER, sky.VBO);
        gl.vertexAttribPointer(skyProg.vertexPositionAttribute , 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(skyProg.vertexPositionAttribute );

        setMatrixUniforms(skyProg);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, sky.Texture);
        gl.uniform1i(skyProg.samplerSkyUniform, 1);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sky.IBO);
        gl.drawElements(gl.TRIANGLES, sky.IBO.numItems, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(skyProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
}


function drawObj(model){

         gl.useProgram(objProg);

        if(model == sphere){
            gl.bindBuffer(gl.ARRAY_BUFFER, model.VBO);
            gl.vertexAttribPointer(objProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(objProg.vertexPositionAttribute);

            gl.bindBuffer(gl.ARRAY_BUFFER, model.NBO);
            gl.vertexAttribPointer(objProg.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(objProg.vertexNormalAttribute);
            
            setMatrixUniforms(objProg);
          // console.log("center is "+ vec3.str(model.center));
           //console.log("radius is " + model.radius);
            gl.uniform3fv(objProg.CenterUniform, model.center);
            //gl.uniform1f(objProg.RadiusUniform, model.radius);
            gl.uniform3fv(objProg.sphereCenterUniform, sphere.center);
            gl.uniform1f(objProg.sphereRadiusUniform, sphere.radius);
            gl.uniform1i(objProg.isSphereUniform, 1);
            
            gl.activeTexture(gl.TEXTURE2);    
            gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
            gl.uniform1i(objProg.samplerWaterUniform,2);
            
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, water.TextureC);
            gl.uniform1i(objProg.samplerCausticUniform,3);
            
            gl.uniform1f(objProg.causticOnUniform, u_CausticOnLocation);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.IBO);
            gl.drawElements(gl.TRIANGLES, model.IBO.numItems, gl.UNSIGNED_SHORT, 0);
            
        }
        else{
          //   console.log("drawing obj instead of sphere");
            for(var i = 0; i < model.numGroups(); i++) {
                //console.log("model VBO: " +model.VBO(i));
                    gl.bindBuffer(gl.ARRAY_BUFFER, model.VBO(i));
                    gl.vertexAttribPointer(objProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(objProg.vertexPositionAttribute);

                    gl.bindBuffer(gl.ARRAY_BUFFER, model.NBO(i));
                    gl.vertexAttribPointer(objProg.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(objProg.vertexNormalAttribute);

                    setMatrixUniforms(objProg);
                  // console.log("center is "+ vec3.str(model.center));
                   //console.log("radius is " + model.radius);
                    gl.uniform3fv(objProg.CenterUniform, sphere.center);
                    //gl.uniform1f(objProg.RadiusUniform, model.radius);
                    gl.uniform1i(objProg.isSphereUniform, 0);

                    gl.activeTexture(gl.TEXTURE2);    
                    gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
                    gl.uniform1i(objProg.samplerWaterUniform,2);
                    
                    gl.activeTexture(gl.TEXTURE3);
                    gl.bindTexture(gl.TEXTURE_2D, water.TextureC);
                    gl.uniform1i(objProg.samplerCausticUniform,3);
                    
                    gl.uniform1f(objProg.causticOnUniform, u_CausticOnLocation);

                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,model.IBO(i));
                    gl.drawElements(gl.TRIANGLES, model.numIndices(i), gl.UNSIGNED_SHORT, 0);
              }

        }

        gl.disableVertexAttribArray(objProg.vertexPositionAttribute);
        gl.disableVertexAttribArray(objProg.vertexNormalAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}


function drawWater(){

        gl.enable(gl.CULL_FACE);
        for(var i=0 ;i<2; i++){  
              
            gl.cullFace(i ? gl.BACK : gl.FRONT);

            gl.useProgram(waterProg[i]);
            gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
            gl.vertexAttribPointer(waterProg[i].vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(waterProg[i].vertexPositionAttribute);

            gl.bindBuffer(gl.ARRAY_BUFFER, water.NBO);
            gl.vertexAttribPointer(waterProg[i].vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(waterProg[i].vertexNormalAttribute);

            setMatrixUniforms(waterProg[i]);
            gl.uniformMatrix4fv(waterProg[i].nmlMatrixUniform, false, nmlMatrix);
            gl.uniform1i(waterProg[i].progNumUniform, i);

            gl.uniform3fv(waterProg[i].sphereCenterUniform, sphere.center);
            gl.uniform1f(waterProg[i].sphereRadiusUniform, sphere.radius);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, sky.Texture);
            gl.uniform1i(waterProg[i].samplerSkyUniform, 1);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, pool.Texture);
            gl.uniform1i(waterProg[i].samplerTileUniform,0);

    
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
            gl.uniform1i(waterProg[i].samplerWaterUniform,2);
            
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, water.TextureC);
            
            gl.uniform1f(waterProg[i].causticOnUniform, u_CausticOnLocation);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
            gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);

            gl.uniform3fv(waterProg[i].eyePositionUniform, eye);


            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null); 
       
        }
        gl.disable(gl.CULL_FACE);
      
}

function drawHeight(x,y){   //TextureA as input, TextureB as output

        x = x || 0;
        y = y || 0;
        
        initColorFrameBuffer(water.TextureB, textureSize, textureSize);
        //resize viewport
        gl.viewport(0, 0, textureSize, textureSize);

        //-------------------start rendering to texture--------------------------------------
        gl.useProgram(heightProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
        gl.vertexAttribPointer(heightProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(heightProg.vertexPositionAttribute);

      //  setMatrixUniforms(heightProg);
        gl.uniform2f(heightProg.centerUniform, x, y);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
        gl.uniform1i(heightProg.samplerWaterUniform,0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
        gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);
     

        //-------------- after rendering---------------------------------------------------
        gl.disableVertexAttribArray(heightProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // reset viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        //swap TextureA  & TextureB 
        var tmp = water.TextureA;
        water.TextureA = water.TextureB;
        water.TextureB = tmp;

}


function drawCaustic(){
       
        initColorFrameBuffer(water.TextureC, textureSize2, textureSize2);

        gl.viewport(0, 0, textureSize2, textureSize2);
        gl.useProgram(causticProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
        gl.vertexAttribPointer(causticProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(causticProg.vertexPositionAttribute);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
        gl.uniform1i(causticProg.samplerWaterUniform,0);

        gl.uniform1i(causticProg.OESderivativesUniform, OES_standard_derivatives);
        gl.uniform1f(causticProg.sphereRadiusUniform, sphere.radius);
        gl.uniform3fv(causticProg.sphereCenterUniform, sphere.center);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
        gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);
        
        gl.disableVertexAttribArray(causticProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

       // reset viewport
       gl.bindFramebuffer(gl.FRAMEBUFFER, null);
       gl.bindRenderbuffer(gl.RENDERBUFFER, null);
       gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
}

function drawNormal(){
        initColorFrameBuffer(water.TextureB, textureSize, textureSize);
        //resize viewport
        gl.viewport(0, 0, textureSize, textureSize);

        //-------------------start rendering to texture--------------------------------------
        gl.useProgram(normalProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
        gl.vertexAttribPointer(normalProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(normalProg.vertexPositionAttribute);

        gl.uniform2f(normalProg.deltaUniform, 1/textureSize, 1/textureSize);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
        gl.uniform1i(normalProg.samplerWaterUniform,0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
        gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);

        //-------------- after rendering---------------------------------------------------
        gl.disableVertexAttribArray(normalProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // reset viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        //swap TextureA  & TextureB 
        var tmp = water.TextureA;
        water.TextureA = water.TextureB;
        water.TextureB = tmp;

}

function drawSimulation(){

        initColorFrameBuffer(water.TextureB, textureSize, textureSize);
        //resize viewport
        gl.viewport(0, 0, textureSize, textureSize);

        //-------------------start rendering to texture--------------------------------------
        gl.useProgram(simulateProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
        gl.vertexAttribPointer(simulateProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(simulateProg.vertexPositionAttribute);

        gl.uniform2f(simulateProg.deltaUniform, 1/textureSize, 1/textureSize);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
        gl.uniform1i(simulateProg.samplerWaterUniform,0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
        gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);

        //-------------- after rendering---------------------------------------------------
        gl.disableVertexAttribArray(simulateProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // reset viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        //swap TextureA  & TextureB 
        var tmp = water.TextureA;
        water.TextureA = water.TextureB;
        water.TextureB = tmp;


}

function drawInteraction(){

        initColorFrameBuffer(water.TextureB, textureSize, textureSize);
        //resize viewport
        gl.viewport(0, 0, textureSize, textureSize);

        //-------------------start rendering to texture--------------------------------------
        gl.useProgram(objectProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
        gl.vertexAttribPointer(objectProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(objectProg.vertexPositionAttribute);

       // console.log("old center: "+ vec3.str(sphere.oldcenter));
       // console.log("new center: "+ vec3.str(sphere.center));
        gl.uniform3fv(objectProg.newCenterUniform, sphere.center);
        gl.uniform3fv(objectProg.oldCenterUniform, sphere.oldcenter);
        gl.uniform1f(objectProg.radiusUniform, sphere.radius);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
        gl.uniform1i(objectProg.samplerWaterUniform,0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
        gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);

        //-------------- after rendering---------------------------------------------------
        gl.disableVertexAttribArray(objectProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // reset viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        //swap TextureA  & TextureB 
        var tmp = water.TextureA;
        water.TextureA = water.TextureB;
        water.TextureB = tmp;


}

function drawDepth(){   //draw depth from light source
    initDepthFrameBuffer(colorTexture, depthTexture, textureSize1, textureSize1);
    gl.viewport(0, 0, textureSize1, textureSize1);

    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.colorMask(false, false, false, false);  //disable writing to color
    gl.useProgram(depthProg);

    gl.bindBuffer(gl.ARRAY_BUFFER, objModel.VBO(0));
    gl.vertexAttribPointer(depthProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(depthProg.vertexPositionAttribute);
        
    var lightView = mat4.lookAt(lightInvDir, vec3.create([0,0,0]), vec3.create([0,1,0]));  //from the point of view of the light
    var lightProj = mat4.ortho(-1,1,-1,1,-2,2);  //axis-aligned box (-10,10),(-10,10),(-10,20) on the X,Y and Z axes

    
    mat4.identity(lightMatrix);
    mat4.multiply(lightMatrix, lightView);
    mat4.inverse(lightMatrix);
    gl.uniformMatrix4fv(depthProg.pMatrixUniform, false, lightProj);
    gl.uniformMatrix4fv(depthProg.mvMatrixUniform, false, lightMatrix);    //model view matrix is from light

    gl.uniform3fv(depthProg.centerUniform, sphere.center);
    console.log("objmode: "+ objModel.IBO(0).numItems);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objModel.IBO(0));
    gl.drawElements(gl.TRIANGLES, objModel.numIndices(0), gl.UNSIGNED_SHORT, 0);

     //-------------- after rendering---------------------------------------------------
    gl.disableVertexAttribArray(depthProg.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.colorMask(true, true, true, true); 

    // reset viewport
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    
}

function drawWind(){

        initColorFrameBuffer(water.TextureB, textureSize, textureSize);
        //resize viewport
        gl.viewport(0, 0, textureSize, textureSize);

        //-------------------start rendering to texture--------------------------------------
        gl.useProgram(windProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, water.VBO);
        gl.vertexAttribPointer(windProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(windProg.vertexPositionAttribute);

      //  setMatrixUniforms((windProg);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, water.TextureA);
        gl.uniform1i(windProg.samplerWaterUniform,0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, permTexture);
        gl.uniform1i(windProg.samplerPermUniform,1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, gradTexture);
        gl.uniform1i(windProg.samplerGradUniform,2);

        accumTime += 0.08;
        //console.log("time: " + accumTime);
        gl.uniform1f(windProg.timeUniform, accumTime);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, water.IBO);
        gl.drawElements(gl.TRIANGLES, water.IBO.numItems, gl.UNSIGNED_SHORT, 0);
     

        //-------------- after rendering---------------------------------------------------
        gl.disableVertexAttribArray(windProg.vertexPositionAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // reset viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

        //swap TextureA  & TextureB 
        var tmp = water.TextureA;
        water.TextureA = water.TextureB;
        water.TextureB = tmp;

}

function drawGodrayPass1(){
    initColorFrameBuffer(godrayTextureA, textureSize1, textureSize1);

    gl.viewport(0, 0, textureSize1, textureSize1);
    gl.useProgram(godrayProg);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, objModel.VBO(0));
    gl.vertexAttribPointer(godrayProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(godrayProg.vertexPositionAttribute);
    
    setMatrixUniforms(godrayProg);
    var lightView = mat4.lookAt(lightInvDir, vec3.create([0,0,0]), vec3.create([0,1,0]));  //from the point of view of the light
    var lightProj = mat4.ortho(-1,1,-1,1,-2,2);  //axis-aligned box (-10,10),(-10,10),(-10,20) on the X,Y and Z axes

    mat4.identity(lightMatrix);
    mat4.multiply(lightMatrix, lightView);
    mat4.inverse(lightMatrix);
    gl.uniformMatrix4fv(godrayProg.pMatrixUniform, false, lightProj);
    gl.uniformMatrix4fv(godrayProg.lightMatrixUniform, false, lightMatrix);    //model view matrix is from light

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.uniform1i(poolProg.samplerInputUniform, 0);
    
    gl.uniform1f(poolProg.passUniform, 1.0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objModel.IBO(0));
    gl.drawElements(gl.TRIANGLES, objModel.numIndices(0), gl.UNSIGNED_SHORT, 0);
    
    gl.disableVertexAttribArray(godrayProg.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

   // reset viewport
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
   gl.bindRenderbuffer(gl.RENDERBUFFER, null);
   gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
}
function drawGodrayPass2(){
    initColorFrameBuffer(godrayTextureB, textureSize1, textureSize1);

    gl.viewport(0, 0, textureSize1, textureSize1);
    gl.useProgram(godrayProg);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, objModel.VBO(0));
    gl.vertexAttribPointer(godrayProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(godrayProg.vertexPositionAttribute);
    
    setMatrixUniforms(godrayProg);
    var lightView = mat4.lookAt(lightInvDir, vec3.create([0,0,0]), vec3.create([0,1,0]));  //from the point of view of the light
    var lightProj = mat4.ortho(-1,1,-1,1,-2,2);  //axis-aligned box (-10,10),(-10,10),(-10,20) on the X,Y and Z axes

    mat4.identity(lightMatrix);
    mat4.multiply(lightMatrix, lightView);
    mat4.inverse(lightMatrix);
    gl.uniformMatrix4fv(godrayProg.pMatrixUniform, false, lightProj);
    gl.uniformMatrix4fv(godrayProg.lightMatrixUniform, false, lightMatrix);    //model view matrix is from light

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, godrayTextureB);
    gl.uniform1i(poolProg.samplerInputUniform, 0);
    
    gl.uniform1f(poolProg.passUniform, 2.0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objModel.IBO(0));
    gl.drawElements(gl.TRIANGLES, objModel.numIndices(0), gl.UNSIGNED_SHORT, 0);
    
    gl.disableVertexAttribArray(godrayProg.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

   // reset viewport
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
   gl.bindRenderbuffer(gl.RENDERBUFFER, null);
   gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
}
function drawGodrayPass3(){
    initColorFrameBuffer(godrayTextureA, textureSize1, textureSize1);

    gl.viewport(0, 0, textureSize1, textureSize1);
    gl.useProgram(godrayProg);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, objModel.VBO(0));
    gl.vertexAttribPointer(godrayProg.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(godrayProg.vertexPositionAttribute);
    
    setMatrixUniforms(godrayProg);
    var lightView = mat4.lookAt(lightInvDir, vec3.create([0,0,0]), vec3.create([0,1,0]));  //from the point of view of the light
    var lightProj = mat4.ortho(-1,1,-1,1,-2,2);  //axis-aligned box (-10,10),(-10,10),(-10,20) on the X,Y and Z axes

    mat4.identity(lightMatrix);
    mat4.multiply(lightMatrix, lightView);
    mat4.inverse(lightMatrix);
    gl.uniformMatrix4fv(godrayProg.pMatrixUniform, false, lightProj);
    gl.uniformMatrix4fv(godrayProg.lightMatrixUniform, false, lightMatrix);    //model view matrix is from light

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, godrayTextureA);
    gl.uniform1i(poolProg.samplerInputUniform, 0);
    
    gl.uniform1f(poolProg.passUniform, 3.0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objModel.IBO(0));
    gl.drawElements(gl.TRIANGLES, objModel.numIndices(0), gl.UNSIGNED_SHORT, 0);
    
    gl.disableVertexAttribArray(godrayProg.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

   // reset viewport
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
   gl.bindRenderbuffer(gl.RENDERBUFFER, null);
   gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
}
//o3djs.require('o3djs.math');
//o3djs.require('o3djs.quaternions');
//o3djs.require('o3djs.particles');


function initRain() {
    var emitter = g_particleSystem.createParticleEmitter();
    emitter.setTranslation(200, 200, 0);
    emitter.setState(o3djs.particles.ParticleStateIds.BLEND);
    emitter.setColorRamp(
        [0.2, 0.2, 1, 1]);
    emitter.setParameters({
        numParticles: 80,
        lifeTime: 2,
        timeRange: 2,
        startSize: 5,
        endSize: 5,
        positionRange: [100, 0, 100],
        velocity: [0,-150,0]});
}

function initColorFrameBuffer(texture, width, height){   // rendering to a texture
    framebuffer = framebuffer || gl.createFramebuffer();
    renderbuffer = renderbuffer || gl.createRenderbuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);

    framebuffer.width = width;
    framebuffer.height = height;

    if (width!= renderbuffer.width ||height!= renderbuffer.height) {
      renderbuffer.width = width;
      renderbuffer.height = height;
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    }
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
      alert("Color Framebuffer is not working.");
    }

}

function initDepthFrameBuffer(coltexture, deptexture, width, height){   // rendering to a texture
    framebuffer1 = framebuffer1 || gl.createFramebuffer();
    //renderbuffer1 = renderbuffer1 || gl.createRenderbuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer1);
   // gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer1);
  //gl.bindFramebuffer(gl.RENDERBUFFER, null);

    framebuffer.width = width;
    framebuffer.height = height;

    // if (width!= renderbuffer1.width ||height!= renderbuffer1.height) {
    //   renderbuffer1.width = width;
    //   renderbuffer1.height = height;
    //   gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    // }
    
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, coltexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, deptexture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
      alert("Depth Framebuffer is not working.");
    }

}



function registerAsyncObj( gl, asyncObj ){
    if( !gl.asyncObjArray ){
        gl.asyncObjArray = [];
    }
    gl.asyncObjArray[gl.asyncObjArray.length] = asyncObj;
}

function check(){
    var i;
    var n;
    n = gl.asyncObjArray.length;
    //check if resources are ready, one by one
    for( i = 0; i < gl.asyncObjArray.length; ++i ){
        if( gl.asyncObjArray[i].isReady() ){
            //Run object's registered callback functions
            gl.asyncObjArray[i].executeCallBackFunc();
            n -= 1;
        }
    }
    if( n === 0 ){
       tick();
    }
    else{
        setTimeout( check, 500, gl );
    }
}

function tick() {
    var now = Date.now() / 1000;  
    var elapsedTime = now - then;
    then = now;

    // update the frame history.
    totalTimeForFrames += elapsedTime - (frameTimeHistory[frameTimeIndex] || 0);
    frameTimeHistory[frameTimeIndex] = elapsedTime;
    frameTimeIndex = (frameTimeIndex + 1) % numFramesToAverage;

    // compute fps
    var averageElapsedTime = totalTimeForFrames / numFramesToAverage;
    var fps = 1 / averageElapsedTime;
    document.getElementById("fps").innerText = fps.toFixed(0); 
    //$('#fps').html(fps.toFixed(0));

    requestAnimFrame(tick);
    drawScene();

}



function webGLStart() {
    var canvas = document.getElementById("the-canvas");
    initGL(canvas);

    canvas.onmousedown = handleMouseDown;
    canvas.oncontextmenu = function(ev) {return false;};
    canvas.onmousewheel   = handleMouseWheel;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;

    //enable necessry extensions.
    OES_texture_float_linear = gl.getExtension("OES_texture_float_linear");
    OES_texture_float = gl.getExtension("OES_texture_float");
    OES_texture_half_float  = gl.getExtension("OES_texture_half_float");
    OES_texture_half_float_linear = gl.getExtension("OES_texture_half_float_linear");
    OES_standard_derivatives = gl.getExtension("OES_standard_derivatives");
    WEBGL_draw_buffers = gl.getExtension( "WEBGL_draw_buffers");
    WEBGL_depth_texture = gl.getExtension( "WEBGL_depth_texture" );
    if(!WEBGL_depth_texture){
        alert("Depth Texture is not available");
    }
    //console.log(OES_standard_derivatives);

    initShaders();

  //  initBuffers();
  var sphereObj = createSphere(sphereRadius, 12, 12);
  
  initBuffers(sky, cubeSky);
  initBuffers(pool, cubePool);
  initBuffers(sphere, sphereObj);
  initBuffers(water, planeWater);
  initBuffers(quad, screenQuad);
  sphere.center = vec3.create([0.0,-0.65,0.0]);
  sphere.oldcenter = vec3.create(sphere.center);
  sphere.radius = sphereObj.radius;

   initObjs();
   // initTexture();
   pool.Texture = gl.createTexture();
   //initTexture(pool.Texture, "tile/tile.png");
   initTexture(pool.Texture, "tile/tile3.jpg");
   currentPoolPattern = "white brick";
   water.TextureA = gl.createTexture();
   water.TextureB = gl.createTexture();
   water.TextureC = gl.createTexture();
   depthTexture = gl.createTexture();
   colorTexture = gl.createTexture();
   permTexture = gl.createTexture();
   gradTexture = gl.createTexture();
   godrayTextureA = gl.createTexture();
   godrayTextureB = gl.createTexture();

  var filter = OES_texture_float_linear? gl.LINEAR : gl.NEAREST;
  initCustomeTexture(water.TextureA, gl.RGBA, filter, gl.FLOAT, textureSize, textureSize);
  initCustomeTexture(water.TextureB, gl.RGBA, filter, gl.FLOAT, textureSize, textureSize);
  initCustomeTexture(water.TextureC, gl.RGBA, filter, gl.FLOAT, textureSize2, textureSize2);   //caustic texture is 1024x1024
  initCustomeTexture(depthTexture, gl.DEPTH_COMPONENT, gl.NEAREST, gl.UNSIGNED_SHORT, textureSize1, textureSize1);    //depth texture is 512x512
  //initCustomeTexture(depthTexture, gl.RGBA, filter, gl.FLOAT, textureSize1, textureSize1); 
  initCustomeTexture(colorTexture, gl.RGBA, gl.NEAREST, gl.UNSIGNED_BYTE, textureSize1, textureSize1);
  initCustomeTexture(godrayTextureA, gl.RGBA, gl.NEAREST, gl.UNSIGNED_BYTE, textureSize1, textureSize1);
  initCustomeTexture(godrayTextureB, gl.RGBA, gl.NEAREST, gl.UNSIGNED_BYTE, textureSize1, textureSize1);
  var successA = checkCanDrawToTexture(water.TextureA);
  var successB = checkCanDrawToTexture(water.TextureB);

 /* if ((!successA || !successB) && OES_texture_half_float) {
    console.log("switch to half float");
    filter = OES_texture_half_float_linear ? gl.LINEAR : gl.NEAREST;
    initCustomeTexture(water.TextureA, gl.RGB, filter, gl.HALF_FLOAT_OES, textureSize, textureSize );
    initCustomeTexture(water.TextureB, gl.RGB, filter, gl.HALF_FLOAT_OES, textureSize, textureSize);
  }*/

//  var pixels = [];
//  for(var i = 0; i<256; i++)
//     for(var j = 0; j<256; j++) {
//       var offset = (i*256+j)*4;
//       var value = perm[(j+perm[i]) & 0xFF];
//       pixels[offset] = grad[value & 0x0F][0] * 64 + 64;   // Gradient x
//       pixels[offset+1] = grad[value & 0x0F][1] * 64 + 64; // Gradient y
//       pixels[offset+2] = grad[value & 0x0F][2] * 64 + 64; // Gradient z
//       pixels[offset+3] = value;                     // Permuted index
//     }
//    // console.log("pixels: "+pixels);
// var permArray = new Uint8Array( pixels );
// initCustomeTexture( permTexture, gl.RGBA, gl.NEAREST, gl.UNSIGNED_BYTE, 256, 256, permArray);

var permArray = new Uint8Array( perm );
var gradArray = new Uint8Array( grad );
initCustomeTexture( permTexture, gl.ALPHA, gl.NEAREST, gl.UNSIGNED_BYTE, 256, 1, permArray, gl.REPEAT, gl.CLAMP_TO_EDGE);
initCustomeTexture( gradTexture, gl.RGB, gl.NEAREST, gl.UNSIGNED_BYTE, 16, 1, gradArray, gl.REPEAT, gl.CLAMP_TO_EDGE );

 

   initSkyBoxTexture(); 

    

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    check();
    //tick();
   
}


