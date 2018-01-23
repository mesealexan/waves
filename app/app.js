function _Raycaster() {

    this.mouse = null;
    this.camera = null;
    this.raycaster = new THREE.Raycaster();
    this.onClickEntityes = [];
    this.container = null;

    this.cast = function (event) {
        this.mouse.x = (event.clientX / this.container.clientWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / this.container.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.onClickEntityes, false);
        if (intersects && intersects[0]) {
            return intersects[0];
        }
    }
}

let D, H, N, W, animate, camera, controls, plane, init, initGeometry, mesh, now, renderer, scene, intersected, posVecXZ;
let Raycaster = new _Raycaster();
// simulation resolution
N = 200;

// simulation size (in x and z directions)
W = 1200;
H = 1200;

let int = null; // Interval object

let mass;
let massGeometry;
let massMaterial;

let adding_mass = false;

let p; // intersection point on click.

let container = document.querySelector('#container')

scene = new THREE.Scene();

// start with a flat plane which we'll deform accordingly
plane = new THREE.PlaneGeometry(W, H, N, N);
let planeMaterial = new THREE.MeshBasicMaterial({ color: 0x7F7FFF, opacity: 0, alphaTest: 0.9999/*, transparent: true side: THREE.BackSide*/ });
let planeMesh = new THREE.Mesh(plane, planeMaterial);
console.log(plane);
for (let i = 1; i < plane.vertices.length; i = i + 2) {
    plane.vertices[i].x += W / N;
}
plane.verticesNeedUpdate = true;
//planeMesh.position.y = -15;
plane.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
scene.add(planeMesh);

let group = new THREE.Object3D();

scene.add(group)
group.add(planeMesh);

massGeometry = new THREE.SphereGeometry(1, 32, 32);
massMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
mass = new THREE.Mesh(massGeometry, massMaterial);
scene.fog = new THREE.Fog(0xff0000, 400, 600);

let vertShader = `         
      const int maxRipples = 20;
      uniform vec3 MOUSE_CLICKS[maxRipples];
      uniform float MULTIPLE_AMPLITUDES[maxRipples];
      uniform float initialMultiplier[maxRipples];
      uniform float afterMultiplier[maxRipples];
      uniform float waveMovement[maxRipples];
      uniform float waveWidth;
      uniform float maxWave[maxRipples];
      uniform float minWave[maxRipples];

      const float SIGMA = 0.01;

      float interpolate (float x1, float x2, float x3, float y1, float y3) {
        return ((x2 - x1) * (y3 - y1)) / (x3 - x1) + y1;
      }

      void main() {
        vec3 p = position;

        for(int i = 0; i < maxRipples; i++) {
          float x = p.x - MOUSE_CLICKS[i].x;
          float z = p.z - MOUSE_CLICKS[i].z;
          float inverseAmplitude = 1.0;
          float after = 0.0;
          float initial = 0.0;

          if (MULTIPLE_AMPLITUDES[i] == 0.0) {
            inverseAmplitude = 1.0;
          } else {
            inverseAmplitude = 1.0 / MULTIPLE_AMPLITUDES[i];
            initial = -initialMultiplier[i] * MULTIPLE_AMPLITUDES[i] * exp( -SIGMA * inverseAmplitude * x * x) * exp( -SIGMA * inverseAmplitude * z * z);
            float outerCurve = exp( -SIGMA * 1.0/maxWave[i] * x * x) * exp( -SIGMA * 1.0/maxWave[i] * z * z);
            float innerCurve = exp( -SIGMA * 1.0/minWave[i] * x * x) * exp( -SIGMA * 1.0/minWave[i] * z * z);
            after = afterMultiplier[i] * MULTIPLE_AMPLITUDES[i] * ( outerCurve-innerCurve );
          }

          // after = afterMultiplier[i] * MULTIPLE_AMPLITUDES[i] * (exp( -SIGMA * 1.0/maxWave[i] * x * x) * exp( -SIGMA * 1.0/maxWave[i] * z * z));
          // if (distance(MOUSE_CLICKS[i],p) > waveMovement[i]) {
          //     after = afterMultiplier[i] * MULTIPLE_AMPLITUDES[i] * exp( -SIGMA * 1.0/waveMovement[i] * x * x) * exp( -SIGMA * 1.0/waveMovement[i] * z * z);
          // } 
          // else if (distance(MOUSE_CLICKS[i],p) < waveMovement[i] + waveWidth - 15.0 && distance(MOUSE_CLICKS[i],p) > waveMovement[i] + 15.0) {
          //     after = afterMultiplier[i] * MULTIPLE_AMPLITUDES[i]/2.0 * exp( -SIGMA * inverseAmplitude * x * x) * exp( -SIGMA * inverseAmplitude * z * z);
          // } else if (distance(MOUSE_CLICKS[i],p) < waveMovement[i] + waveWidth + 15.0 && distance(MOUSE_CLICKS[i],p) > waveMovement[i] - 15.0) {
          //     after = afterMultiplier[i] * MULTIPLE_AMPLITUDES[i]/2.0 * exp( -SIGMA * inverseAmplitude * x * x) * exp( -SIGMA * inverseAmplitude * z * z);
          // }


          if (distance(MOUSE_CLICKS[i],p) < waveMovement[i] - 3.0) {
            p.y += 0.0;
          } else if (distance(MOUSE_CLICKS[i],p) < waveMovement[i] - 6.0){
            p.y += initial + 0.96 * after;
          } else if (distance(MOUSE_CLICKS[i],p) < waveMovement[i] - 9.0){
            p.y += initial + 0.8 * after;
          } else if (distance(MOUSE_CLICKS[i],p) < waveMovement[i] - 11.0){
            p.y += initial + 0.64 * after;
          } else if (distance(MOUSE_CLICKS[i],p) < waveMovement[i] - 14.0){
            p.y += initial + 0.48 * after;
          } else if (distance(MOUSE_CLICKS[i],p) < waveMovement[i] - 17.0){
            p.y += initial + 0.32 * after;
          } else if (distance(MOUSE_CLICKS[i],p) < waveMovement[i] - 20.0){
            p.y += initial + 0.16 * after;
          } else {
            p.y += initial + after;
          }
         
        };

        vec4 mvPosition = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
        gl_Position = mvPosition;
      }`;

let fragShader = `
          uniform vec3 color;
          uniform float opacity;
          varying float ampNormalized;
          void main() {
            vec3 c = color;
            gl_FragColor = vec4(c, opacity);
          }
          `
    ;
let planeLines = new THREE.LineSegments(plane, new THREE.ShaderMaterial({
    uniforms: {
        color: {
            value: new THREE.Color(0xaeaeae)
        },
        initialMultiplier: {
            type: 'v3v',
            value: new Array(20).fill(0.0)
        },
        afterMultiplier: {
            type: 'v3v',
            value: new Array(20).fill(0.0)
        },
        waveWidth: {
            value: 30.0
        },
        maxWave: {
            type: "fv1",
            value: new Array(20).fill(0.0)
        },
        minWave: {
            type: "fv1",
            value: new Array(20).fill(0.0)
        },
        opacity: {
            value: 1.0
        },
        MOUSE_CLICKS: {
            type: 'v3v',
            value: new Array(20).fill(new THREE.Vector3())
        },
        waveMovement: {
            type: "fv1",
            value: new Array(20).fill(0.0)
        },
        MULTIPLE_AMPLITUDES: {
            type: "fv1",
            value: new Array(20).fill(0)
        }
    },
    vertexShader: vertShader,
    fragmentShader: fragShader
}));
scene.add(planeLines);
let numberOfDefinedWaves = -1;

let Wave = function (position) {

    numberOfDefinedWaves++

    if (numberOfDefinedWaves >= 20)
        numberOfDefinedWaves = 0;

    planeLines.material.uniforms.MOUSE_CLICKS.value[numberOfDefinedWaves] = position;

    let lifeSpan = 100;
    let startingSpan = 0;
    let growRate = 0;
    let enabled = false;
    let counter;
    let nextWave = 30;
    let waveWidth = 30;
    let fadeTime = 0;
    let enable = function (bool) {
        enabled = bool;
    }
    let cate = 0.0;
    let setInitialWave = function (growthRate) {
        planeLines.material.uniforms.MULTIPLE_AMPLITUDES.value[numberOfDefinedWaves] = growthRate;
        planeLines.material.uniforms.initialMultiplier.value[numberOfDefinedWaves] = 1.0;
        planeLines.material.uniforms.afterMultiplier.value[numberOfDefinedWaves] = 0.0;
        planeLines.material.uniforms.waveMovement.value[numberOfDefinedWaves] = 0.0;
        planeLines.material.uniforms.maxWave.value[numberOfDefinedWaves] = 30.0;
        planeLines.material.uniforms.minWave.value[numberOfDefinedWaves] = 0.0;
        cate = growthRate;
        // planeLines.material.uniforms.max_depth.value = growthRate;
        // planeLines.material.uniforms.decays.value[numberOfDefinedWaves] = 1.0;
        // planeLines.material.uniforms.fading.value[numberOfDefinedWaves] = 0.0;
        // planeLines.material.uniforms.wavesWidth.value[numberOfDefinedWaves] = growthRate;

        growRate = growthRate;
        // startingSpan = growthRate / 30;
        lifeSpan = growthRate * 30;
        fadeTime = growthRate;

        counter = Number(JSON.parse(JSON.stringify(numberOfDefinedWaves)));
    }

    let setAmplitude = function () {
        if (!enabled) return;
        startingSpan++;
        if (startingSpan < fadeTime) {
            planeLines.material.uniforms.MULTIPLE_AMPLITUDES.value[counter] += 3.0;
            planeLines.material.uniforms.initialMultiplier.value[counter] -= 1 / fadeTime;
            planeLines.material.uniforms.afterMultiplier.value[counter] += 1 / fadeTime;
        } else if (startingSpan < lifeSpan) {
            cate += 3.0;
            planeLines.material.uniforms.MULTIPLE_AMPLITUDES.value[counter] += 15.0;
            planeLines.material.uniforms.maxWave.value[counter] += 3.0;
            planeLines.material.uniforms.minWave.value[counter] += 3.0;
            planeLines.material.uniforms.waveMovement.value[counter] += 3.0;
            //   // planeLines.material.uniforms.decays.value[counter] -= 1/(lifeSpan);
            //   // planeLines.material.uniforms.wavesWidth.value[numberOfDefinedWaves] = waveWidth;
            //   // planeLines.material.uniforms.fading.value[counter] += 3.0;
        } else if (startingSpan < lifeSpan + fadeTime - 1) {
            planeLines.material.uniforms.MULTIPLE_AMPLITUDES.value[counter] -= cate / fadeTime;
            // planeLines.material.uniforms.maxWave.value[counter] += 3.0;
            // planeLines.material.uniforms.minWave.value[counter] += 3.0;
        } else {
            planeLines.material.uniforms.MULTIPLE_AMPLITUDES.value[counter] = 0;
            enabled = false;
        }
    }
    return {
        setInitialWave: setInitialWave,
        setAmplitude: setAmplitude,
        enable: enable
    }
}
init = function () {
    let cubeGeometry, cubeMesh, face, light, materials, matrix, updateViewport, _i, _len, _ref;

    let app = this;

    camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 1, 5000)
    camera.position.z = 400;
    camera.position.y = 150;

    // scene.background = new THREE.Color(0xffffff)

    renderer = new THREE.WebGLRenderer({ antialias: true, transparent: true })

    controls = new THREE.TrackballControls(camera);

    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    container.appendChild(renderer.domElement)


    light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1);
    scene.add(light);

    Raycaster.mouse = new THREE.Vector2();
    Raycaster.camera = camera;
    Raycaster.onClickEntityes = group.children;
    Raycaster.container = container;

    // scene.fog = new THREE.Fog( 0xaeaeae, 200,400); 
    renderer.setClearColor(0xffffff, 1);
    animate();
    //return document.body.appendChild(renderer.domElement);
}

animate = function () {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
    updateWaves();
};

let updateWaves = function () {
    for (let i = 0; i < wavesToUpdate.length; i++) {
        wavesToUpdate[i].setAmplitude();
    }
}

let ampIndex;
let scale = 1;
let wave;
let wavesToUpdate = [];
let waveIndex = 0;
let spherGrowthInterval = setInterval(function () { }, 1);

let wasIntersected;

let onMouseDown = function (e) {
    // prevent right or mmb clicks
    if (e.button === 1 || e.button === 2) return false;
    let vector;
    let theX = e.clientX || e.center.x;
    let theY = e.clientY || e.center.y;

    vector = new THREE.Vector3((theX / window.innerWidth) * 2 - 1, -(theY / window.innerHeight) * 2 + 1, 0.5);
    vector.unproject(camera);

    intersected = Raycaster.cast(e);

    if (intersected) {
        adding_mass = true;
        wasIntersected = true;
        p = intersected.point;
        // create a new initial condition (droplet) based on clicked location
        mass.position.set(p.x, p.y, p.z);//

        mass.scale.x = scale;
        mass.scale.y = scale;
        mass.scale.z = scale;

        wave = new Wave(new THREE.Vector3(intersected.point.x, 0, intersected.point.z));
        wavesToUpdate.push(wave);

        let start = 0xFF0000,
            end = 0x00000, temp;

        spherGrowthInterval = setInterval(function () {
            let temp = (start).toString(16);
            if (temp.length < 8) {
                temp = "0000000".substring(0, 8 - temp.length) + temp;
            }
            start -= 0xFF0000;
            scale += 0.2;
            mass.scale.x = scale * 0.7;
            mass.scale.y = scale * 0.7;
            mass.scale.z = scale * 0.7;
            wave.setInitialWave(scale);
            mass.material.color.setHex(temp);
        }, 10);

        scene.add(mass);
    }
}

let onMouseUp = function (e) {
    scene.remove(mass);
    if (wasIntersected) {
        adding_mass = false;
        scale = 1; // adjust the multiplier to whatever
        //planeLines.material.uniforms.max_depth.value ;
        clearInterval(spherGrowthInterval);
        wave.enable(true);
        wasIntersected = false;
    }
}

document.addEventListener('mousedown', onMouseDown, false);
document.addEventListener('mouseup', onMouseUp, false);

init();