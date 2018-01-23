var C, C2, D, DAMPING, DELTA_X, DELTA_X2, DELTA_Z, DELTA_Z2, H, MAX_DT, MAX_ITERATRED_DT, MAX_Y, N, SIGMA, SIM_SPEED, W, animate, camera, controls, geometry, hitTest, idx, init, initGeometry, integrate, mesh, now, projector, renderer, scene;

mesh = null;
renderer = null;
scene = null;
camera = null;
geometry = null;
controls = null;
projector = null;


// simulation resolution
N = 90;

// simulation size (in x and z directions)
W = 800;
H = 500;

// wave propagation speed (relationship between time and space)
C = 0.09;
C2 = C * C;

// damping coefficient
DAMPING = 0.0005;
SIM_SPEED = 1;



// precompute some deltas for our finite differences
DELTA_X = W / N;
DELTA_X2 = DELTA_X * DELTA_X;
DELTA_Z = H / N;
DELTA_Z2 = DELTA_Z * DELTA_Z;

// we're using iterated Euler's method
// specify iteration dt
MAX_DT = 2;
// we won't be simulating beyond this dt
MAX_ITERATRED_DT = 100;

// some constants for the initial state of the world
// the height of the original droplet
MAX_Y = 0;


var temp_max_y = 0;
var to = null; // Timeout object
var int = null; // Interval object

var adding_mass = true;

var mass;
var massGeometry;
var massMaterial


var p; // intersection point on click.

var ctx_mass;
var osc_mass;


var ctx_wave;
var osc_wave;
// the concentration of the original droplet
// this is the square of the inverse of the usual "sigma" used in the gaussian distribution
SIGMA = 0.004;

// initialization of three.js, a basic camera, some lights, and the overall scene
init = function () {
    var cubeGeometry, cubeMesh, face, light, materials, matrix, updateViewport, _i, _len, _ref;
    camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 400;
    camera.position.y = 150;
    camera.position.x = 0;

    scene = new THREE.Scene();

    light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1);
    scene.add(light);

    // start with a flat plane which we'll deform accordingly
    geometry = new THREE.PlaneGeometry(W, H, N, N);
    matrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    geometry.applyMatrix(matrix);;

    initGeometry();


    var massGeometry = new THREE.SphereGeometry(1, 32, 32);
    var massMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    mass = new THREE.Mesh(massGeometry, massMaterial);




    ctx_mass = new (window.AudioContext || window.webkitAudioContext)();
    osc_mass = ctx_mass.createOscillator(); // instantiate an osc_massillator
    osc_mass.type = 'sawtooth'; // this is the default - also square, sawtooth, triangle
    osc_mass.frequency.value = 100;
    osc_mass.start();


    ctx_wave = new (window.AudioContext || window.webkitAudioContext)();
    osc_wave = ctx_wave.createOscillator(); // instantiate an osc_massillator
    osc_wave.type; // this is the default - also square, sawtooth, triangle
    osc_wave.frequency.value = 100;
    osc_wave.start();




    mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x7F7FFF, wireframe: true, transparent: true }));

    scene.add(mesh);

    controls = new THREE.TrackballControls(camera);

    projector = new THREE.Projector();

    renderer = new THREE.WebGLRenderer();
    updateViewport = function () {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        //return controls.target.set(0, 0, 0);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);

    scene.fog = new THREE.FogExp2(0xE0E0E0, 0.0020);
    renderer.setClearColor(scene.fog.color, 1);
    return document.body.appendChild(renderer.domElement);
};

now = Date.now();

// main loop function
animate = function () {


    var dt;
    dt = Date.now() - now;
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    //controls.update();
    dt *= SIM_SPEED;

    if (dt > MAX_ITERATRED_DT) {
        dt = MAX_ITERATRED_DT;
    }

    // iterated Euler's method
    while (dt > 0) {
        if (dt > MAX_DT) {
            integrate(MAX_DT);
        } else {
            integrate(dt);
        }
        dt -= MAX_DT;
    }
    return now = Date.now();


};

// convert from (x, z) indices to an index in the vertex array
idx = function (x, z) {
    return x + (N + 1) * z;
};

// generate the initial condition for the simulation
initGeometry = function () {
    var index, v, _i, _len, _ref, _results;
    _ref = geometry.vertices;
    _results = [];
    for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {

        // the initial condition is a symmetric 2d Gaussian
        // See http://en.wikipedia.org/wiki/Gaussian_function
        v = _ref[index];
        //v.y = MAX_Y * Math.sin((v.x + W / 2) / W * SPACE_X_OMEGA) * Math.sin((v.z + H / 2) / H * SPACE_Z_OMEGA) * Math.exp(-Math.abs(0.01 * v.x)) * Math.exp(-Math.abs(0.02 * v.z))
        v.y = MAX_Y * Math.exp(-SIGMA * v.x * v.x) * Math.exp(-SIGMA * v.z * v.z);
        v.uy = 0;
        _results.push(v.ay = 0);
    }
    return _results;
};

integrate = function (dt) {
    var d2x, d2z, i, iNextX, iNextZ, iPrevX, iPrevZ, v, x, z, _i, _j, _k, _l;
    v = geometry.vertices;
    for (z = _i = 1; 1 <= N ? _i < N : _i > N; z = 1 <= N ? ++_i : --_i) {
        for (x = _j = 1; 1 <= N ? _j < N : _j > N; x = 1 <= N ? ++_j : --_j) {
            i = idx(x, z);

            // find neighbouring points in grid
            iPrevX = idx(x - 1, z);
            iNextX = idx(x + 1, z);
            iPrevZ = idx(x, z - 1);
            iNextZ = idx(x, z + 1);

            // evaluate the second space-derivatives using finite differences
            // see http://en.wikipedia.org/wiki/Finite_difference//Higher-order_differences
            d2x = (v[iNextX].y - 2 * v[i].y + v[iPrevX].y) / DELTA_X2;
            d2z = (v[iNextZ].y - 2 * v[i].y + v[iPrevZ].y) / DELTA_Z2;

            // the Wave partial differential equation in 2D
            // see https://en.wikipedia.org/wiki/Wave_equation
            // "d2x + d2z" is the spacial laplacian, ay is the acceleration w.r.t time
            v[i].ay = C2 * (d2x + d2z);

            // add a non-homogeneous term to introduce damping
            // see http://uhaweb.hartford.edu/noonburg/m344lecture16.pdf
            v[i].ay += -DAMPING * v[i].uy;

            // use Euler integration to find the new velocity w.r.t. time
            // and the new vertical position
            // see https://en.wikipedia.org/wiki/Euler_integration
            v[i].uy += dt * v[i].ay;
            v[i].newY = v[i].y + dt * v[i].uy;
        }
    }
    // Commit the changes in the simulation
    // This is done in a separate step so that each simulation step doesn't affect itself
    for (z = _k = 1; 1 <= N ? _k < N : _k > N; z = 1 <= N ? ++_k : --_k) {
        for (x = _l = 1; 1 <= N ? _l < N : _l > N; x = 1 <= N ? ++_l : --_l) {
            i = idx(x, z);
            v[i].y = v[i].newY;
        }
    }
    geometry.verticesNeedUpdate = true;
    //geometry.computeFaceNormals();
    //geometry.computeVertexNormals();
    return geometry.normalsNeedUpdate = true;
};
onMouseUp = function (e) {
    osc_mass.disconnect(ctx_mass.destination);
    scene.remove(mass);
    //clearTimeout(to); // Clear the timeout
    clearInterval(int); // Clear the interval
    adding_mass = false;

}

onMouseDown = function (e) {
    adding_mass = true;
    // see http://mrdoob.github.io/three.js/examples/canvas_interactive_cubes.html for details on hit testing
    var index, intersects, raycaster, vector;
    vector = new THREE.Vector3((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, 0.5);
    projector.unprojectVector(vector, camera);
    raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
    intersects = raycaster.intersectObjects([mesh]);

    if (intersects.length) {
        p = intersects[0].point;
        // create a new initial condition (droplet) based on clicked location
        //console.log(p.position);
        mass.position.set(p.x, p.y, p.z);//

        var scale = 0; // adjust the multiplier to whatever

        mass.scale.x = scale;
        mass.scale.y = scale;
        mass.scale.z = scale;

        scene.add(mass);

        MAX_Y = 0;
        temp_max_y = 0;
        temp_max_y -= 2;

        var start = 0xFF0000,
            end = 0x00000, temp;

        var freq = 173;
        osc_mass.frequency.value = freq; // Hz
        osc_mass.connect(ctx_mass.destination);

        int = setInterval(function () {
            temp_max_y -= 0.1;
            MAX_Y = temp_max_y;

            temp = (start).toString(16);
            if (temp.length < 8) {
                temp = "0000000".substring(0, 8 - temp.length) + temp;
            }
            start -= 0xFF0000;

            freq -= 0.5;
            osc_mass.frequency.value = freq; // Hz

            scale += 0.2;
            mass.scale.x = scale;
            mass.scale.y = scale;
            mass.scale.z = scale;

            mass.material.color.setHex(temp);

            var index, v, x, z, _i, _len, _ref, _results;
            _ref = geometry.vertices;
            _results = [];
            for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
                v = _ref[index];
                x = v.x - p.x;
                z = v.z - p.z;
                v.y += MAX_Y * Math.exp(-SIGMA * x * x) * Math.exp(-SIGMA * z * z);
                //_results.push(void 0);
                if (v.x === -W / 2 || v.x === W / 2 || v.z === -H / 2 || v.z === H / 2) {
                    _results.push(v.y = 1);
                } else {
                    _results.push(void 0);
                }
            }
            return _results;
        }, 10); // Interval time for which to increment the temp value; every 75 ms on mouse down


    }
};

init();




animate();
