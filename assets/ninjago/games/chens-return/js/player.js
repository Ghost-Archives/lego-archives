




function Player( level, onReadyCallback, filePath = "player" ) // <editor-fold defaultstate="collapsed">
{
    // store parent    
    this.level = level;
    this.levelId = this.level.jsonData.id;
    this.onReadyCallback = onReadyCallback;
    this.filePath = filePath;
    
    // props
    this.debug = false;
    this.spinjitzu = false;
    this.invincible = false;
    this.vehicleMaxDuration = 20; //15
    this.vehicleStateCount = 0;
    
    this.halfPI = Math.PI * 0.5;
    
    this.dustTarget = new zen3d.Vector3();
    
    // state
    
    this.STATES = 
    {
        INIT:                       0,
        IDLE:                       1,
        RUNNING:                    2,
        STRAFE_L:                   3,
        STRAFE_R:                   4,
        JUMP:                       5,
        CROUCH:                     6,
        DIE:                        7,
        SPINJITZU:                  8,
        TRANSFORM:                  9,
        VEHICLE:                    10,
        VEHICLE_L:                  11,
        VEHICLE_R:                  12,
        VEHICLE_UP:                 13,
        VEHICLE_DOWN:               14,
        TRANSFORM_REVERSE:          15,
        JUMP_ANIM_ONLY:             16,
        DRAW_GOLDEN_WEAPON:         17,
        GOLDEN_WEAPON:              18,
        CHEER:                      19,
        UNLOAD:                     30
    };
    
    this.STATECOUNT = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
    
    this.state = this.lastState = this.STATES.INIT;
    
    // animations
    
    this.animations = 
    {
        RUNNING: 
        { 
            start:  1 / 30,
            end:    20 / 30,
            len:    20 / 30,
            loop:   true
        },
        STRAFE_L: 
        { 
            start:  25 / 30,
            end:    36 / 30,
            len:    12 / 30,
            loop:   false
        },
        STRAFE_R: 
        { 
            start:  40 / 30,
            end:    51 / 30,
            len:    12 / 30,
            loop:   false
        },
        CROUCH: 
        { 
            start:  55 / 30,
            end:    74 / 30,
            len:    20 / 30,
            loop:   true
        },
        JUMP_1: 
        { 
            start:  80 / 30,
            end:    96 / 30,
            len:    17 / 30,
            loop:   false
        },
        JUMP_2: 
        { 
            start:  100 / 30,
            end:    116 / 30,
            len:    17 / 30,
            loop:   false
        },
        DIE_1: 
        { 
            start:  150 / 30,
            end:    185 / 30,
            len:    36 / 30,
            loop:   false
        },
        IDLE: 
        { 
            start:  190 / 30,
            end:    225 / 30,
            len:    35 / 30,
            loop:   true
        },
        TRANSFORM: 
        { 
            start:  230 / 30,
            end:    265 / 30,
            len:    35 / 30,
            loop:   false
        },
        VEHICLE: 
        { 
            start:  270 / 30,
            end:    329 / 30,
            len:    60 / 30,
            loop:   true
        },
        VEHICLE_R:
        { 
            start:  330 / 30,
            end:    359 / 30,
            len:    30 / 30,
            loop:   false
        },
        VEHICLE_L:
        { 
            start:  360 / 30,
            end:    389 / 30,
            len:    30 / 30,
            loop:   false
        }
    };
    
    if ( this.levelId === 2 )
    {
        this.animations.VEHICLE.start = 270 / 30;
        this.animations.VEHICLE.end = 302 / 30;
        this.animations.VEHICLE.len = 33 / 30;
        
        this.animations.VEHICLE_L.start = 305 / 30;
        this.animations.VEHICLE_L.end = 320 / 30;
        this.animations.VEHICLE_L.len = 16 / 30;
        
        this.animations.VEHICLE_R.start = 325 / 30;
        this.animations.VEHICLE_R.end = 340 / 30;
        this.animations.VEHICLE_R.len = 16 / 30;
        
        this.animations.VEHICLE_DOWN =
        {
            start:  345 / 30,
            end:    384 / 30,
            len:    40 / 30,
            loop:   false
        };
        
        this.animations.VEHICLE_UP =
        {
            start:  390 / 30,
            end:    448 / 30,
            len:    59 / 30,
            loop:   false
        };
    }
    
    if ( this.levelId === 3 )
    {
        this.animations.GOLDEN_WEAPON_DRAW =
        {
            start:  230 / 30,
            end:    281 / 30,
            len:    52 / 30,
            loop:   false
        };
        this.animations.GOLDEN_WEAPON_STRIKE =
        {
            start:  285 / 30,
            end:    329 / 30,
            len:    45 / 30,
            loop:   false
        };
        this.animations.CHEER =
        { 
            start:  335 / 30,
            end:    495 / 30,
            len:    161 / 30,
            loop:   false
        };
    }
    
    this.currentAnim = "";
    
    // local position
    this.localPos = new zen3d.Vector3();
    this.localPosWorldRotation = new zen3d.Vector3();
    this.worldPos = new zen3d.Vector3();
    this.worldQuat = new zen3d.Quaternion();

    // shots
    
    this.up = zen3d.Vector3( 0, 1, 0 );
    this.shots = [];
    this.currentShot = 0;
    this.currentShooterSide = 1;
    this.shotOrigin = new zen3d.Vector3();
    this.shotDirection = new zen3d.Matrix4();
    this.shotVelocity = 20;
    this.shotCooldownTime = 0.2;
    this.shotCooldownCount = 0;
    this.turretEuler = 0;
    
    this.blinkCount = 0;
    this.blinkInterval = 0.2;
   
    // create materials
    
    let rimlight = 
    {
        position: new zen3d.Vector3( this.level.jsonData.rimLightPos.x, this.level.jsonData.rimLightPos.y, this.level.jsonData.rimLightPos.z ).normalize(),
        color: new zen3d.Color3( this.level.jsonData.rimLightColor )
    };
    
    let baseUrl = App.level.jsonData.baseUrl;
    
    this.minifigure_material = new FastPbrMaterial( "player", baseUrl + "player/" + this.filePath, rimlight, "front", level.envMap );
    this.face_mat = new FaceMaterial( baseUrl + "player/" + this.filePath + "_face.png", { tileW: 256, tileH: 256, texW: 512, texH: 512 }, level.envMap );

    this.shot_material = new FastPbrMaterial( "shot", baseUrl + "player/" + this.filePath, rimlight, "front", level.envMap );
    this.shot_material.transparent = true;
    this.shot_material.depthWrite = true;
    this.shot_material.depthTest = true;
    this.shot_material.blending = zen3d.BLEND_TYPE.CUSTOM;
    this.shot_material.blendSrc = zen3d.BLEND_FACTOR.SRC_ALPHA;
    this.shot_material.blendDst = zen3d.BLEND_FACTOR.ONE;
    
    this.transform_bg_mat = new UnlitMaterial( "transform_bg", baseUrl + "player/" + this.filePath + "_aa.png", 0.0005 );
    this.transform_bg_mat.transparent = true;
    this.transform_bg_mat.depthWrite = true;
    this.transform_bg_mat.depthTest = true;
    
    // facial anim
    this.facialAnim = {};
    
    this.facialAnim.IDLE = gsap.timeline( { paused: true, repeat: -1 } );
    this.facialAnim.IDLE.call( this.face_mat.setFrame.bind( this.face_mat ), [ 0 ], 0 );
    this.facialAnim.IDLE.call( this.face_mat.setFrame.bind( this.face_mat ), [ 2 ], 1 );
    this.facialAnim.IDLE.call( this.face_mat.setFrame.bind( this.face_mat ), [ 1 ], 1.1 );
    this.facialAnim.IDLE.call( this.face_mat.setFrame.bind( this.face_mat ), [ 0 ], 1.2 );
    this.facialAnim.IDLE.call( this.face_mat.setFrame.bind( this.face_mat ), [ 2 ], 3 );
    this.facialAnim.IDLE.call( this.face_mat.setFrame.bind( this.face_mat ), [ 1 ], 3.1 );
    this.facialAnim.IDLE.call( this.face_mat.setFrame.bind( this.face_mat ), [ 0 ], 3.2 );
    this.facialAnim.IDLE.call( this.face_mat.setFrame.bind( this.face_mat ), [ 0 ], 5 );
    
    this.facialAnim.DIE = gsap.timeline( { paused: true, repeat: 0 } );
    this.facialAnim.DIE.call( this.face_mat.setFrame.bind( this.face_mat ), [ 3 ], 0 );

    // create object
    var data = App.loader.extract( baseUrl + "player/" + this.filePath + ".glb" );
    this.loader = new zen3d.GLTFLoader();
    this.loader.load( data, this.onLoadingComplete.bind( this ), undefined, undefined, [ this.minifigure_material, this.face_mat, this.shot_material, this.transform_bg_mat ] );
}
// </editor-fold>

Player.prototype.onLoadingComplete = function( obj ) // <editor-fold defaultstate="collapsed">
{
    // store materials
    let all = AppUtils.getAllObjects( obj.scene.children, "", "" );
    let materials = {};
    let mesh;
    
    for ( let a = 0; a < all.length; a++ )
    {
        mesh = all[a];
        
        if ( mesh.material )
        {
            if ( materials.hasOwnProperty( mesh.material.uuid ) === false )
            {
                materials[ mesh.material.uuid ] = mesh.material;
            }
        }
    }
    
    this.material_uniforms = [];
    
    for ( a in materials )
    {
        this.material_uniforms.push( materials[a].uniforms );
    }
    
    // store display reference
    this.display = new zen3d.Object3D();
    this.cam = obj.cameras[0];
    this.camRoot = AppUtils.getObjectsByNameAndType( obj.scene.children, "CAM", "", false )[0];    
    this.minifigure = AppUtils.getAllObjects( obj.scene.children, "MINIFIGURE", "", false )[0];

    if ( this.levelId < 3 )
    {
        this.vehicle = AppUtils.getAllObjects( obj.scene.children, "VEHICLE", "", false )[0];
        this.vehicle.visible = false;
        this.vehicle_bg = AppUtils.getAllObjects( this.camRoot.children, "Supercar_Bg", "", false )[0];
        this.vehicle_bg.visible = false;
        
        this.vehicleRotationRoot = this.vehicle.getObjectByName( "RotationRoot" );
        CustomEase.create( "blaster_swingback", "M0,0 C0.198,0.14 0.27,1.144 0.458,1.144 0.56,1.144 0.659,0.934 0.776,0.934 0.838,0.934 0.898,1 1,1" );
    }

    // turret
    if ( this.levelId === 0 )
    {
        this.turret = AppUtils.getAllObjects( this.vehicle, "Turret", "mesh" )[0];
    }
    else if ( this.levelId === 1 )
    {
        this.turret = AppUtils.getAllObjects( this.vehicle, "Minigun", "mesh" )[0];
    }
    else if ( this.levelId === 2 )
    {
        this.L_Lower_Leg = AppUtils.getAllObjects( this.vehicle, "L_Lower_Leg", "mesh" )[0];
        this.R_Lower_Leg = AppUtils.getAllObjects( this.vehicle, "R_Lower_Leg", "mesh" )[0];
    }
    
    // shots
    
    if ( this.levelId < 3 )
    {
        let mesh = AppUtils.getAllObjects( obj.scene.children, "shot", "mesh", false )[0];
        let halfExtent = new CANNON.Vec3( 0.2, 0.2, 0.5 );
        let i = 0;

        for ( i; i < 5; i++ )
        {
            this.shots.push( new ECS.Shot( mesh.clone(), halfExtent, true ) );
        }
    }
    
    // add to display
    this.display.add( this.minifigure );
    if ( this.levelId < 3 ) this.display.add( this.vehicle );
    this.display.add( this.camRoot );
    
    // setup shadow & culling    
    this.allDisplays = AppUtils.getAllObjects( this.display.children, "", "" );
    let len = this.allDisplays.length;
    
    for ( i = 0; i < len; i++ )
    {
        this.allDisplays[i].castShadow = false;
        this.allDisplays[i].receiveShadow = true;
        this.allDisplays[i].frustumCulled = false;
    }
    
    // weapons
    if ( this.levelId < 3 )
    {
        // hide ninja sword
        AppUtils.getAllObjects( this.display.children, "Ninja_Sword", "" )[0].visible = false;
    }
    else
    {
        // get golden weapons
        let tmp = AppUtils.getAllObjects( this.display.children, "Weapon", "" );
        this.goldenWeapon = tmp[0];
        this.goldenWeapon_Backpack = tmp[1];
        this.goldenWeapon.visible = false;
        
        this.transform_bg = AppUtils.getAllObjects( this.camRoot.children, "Supercar_Bg", "", false )[0];
        this.transform_bg.visible = false;
        
        // create fx
        this.goldenGlow = new ParticleSystem
        ({
            num:                4,
            root:               App.scene,
            origin:             new zen3d.Vector3( 0, 0, 0 ),
            gravity:            new zen3d.Vector3( 0, 0, 0 ),
            emitterSize:        new zen3d.Vector3( 0, 0, 0 ),

            velocityRange:      { min: new zen3d.Vector3( 0, 0, 0 ), max: new zen3d.Vector3( 0, 0, 0 ) },
            scaleRange:         { min: 0.1, max: 0.1 },
            lifetimeRange:      { min: 1, max: 1 },
            timeOffsetRange:    { min: 0.25, max: 0.25 },
            alphaRange:         { min: 1, max: 1 },
            fadein:             0.5,
            fadeout:            0.2,
            scaleOverTime:      5,
            rotateOverTime:     0,
            loop:               0,

            img:                App.baseUrl + "/fx/lensflare.png",
            blending:           zen3d.BLEND_TYPE.ADD
        });
        
        this.goldenGlow.mat.depthTest = this.goldenGlow.mat.depthWrite = false;
        let hip = AppUtils.getAllObjects( this.minifigure, "Spine_2", "" )[0];
        this.goldenGlow.display.scale.set( 0, 0, 0 );
        hip.add( this.goldenGlow.display );
    }

    // create minifigure CANNON Body    
    let pos = AppUtils.getPositionFromMatrix( this.display.worldMatrix );
    let quat = new zen3d.Quaternion().setFromRotationMatrix( this.display.worldMatrix );
    
    this.minifigure_body = new CANNON.Body
    ({ 
        type: CANNON.Body.DYNAMIC,
        mass: 1,
        position: pos,
        quaternion: quat,
        collisionFilterGroup: App.physics.CGROUP_PLAYER,
        collisionFilterMask:  App.physics.CMASK_PLAYER
        
    });
    this.minifigure_body.fixedRotation = true;
    this.minifigure_body.updateMassProperties();
    this.minifigure_body.addShape( new CANNON.Sphere( 0.1 ), new CANNON.Vec3( 0, 0.05, 0 ) );
    this.minifigure_body.addShape( new CANNON.Sphere( 0.1 ), new CANNON.Vec3( 0, 0.35, 0 ) );
    this.minifigure_body.addShape( new CANNON.Sphere( 0.1 ), new CANNON.Vec3( 0, 0.2, 0 ) );
    
    App.physics.world.add( this.minifigure_body );
    
    if ( this.debug )
    {        
        this.minifigureBodyDebug = new zen3d.Object3D();
        
        let mat = new zen3d.BasicMaterial();
        mat.diffuse = new zen3d.Color3( 0x00FF00 );
        mat.opacity = 0.3;
        mat.transparent = true;

        let geo = new zen3d.SphereGeometry( 1, 20, 20 );
        let s1 = new zen3d.Mesh( geo, mat );
        let s2 = new zen3d.Mesh( geo, mat );
        s1.scale.set( 0.1, 0.1, 0.1 );
        s2.scale.set( 0.1, 0.1, 0.1 );
        this.minifigureBodyDebug.add( s1 );
        this.minifigureBodyDebug.add( s2 );
        
        App.scene.add( this.minifigureBodyDebug );
    }
    
    // create vehicle CANNON Body

    this.vehicle_body = new CANNON.Body
    ({ 
        type: CANNON.Body.DYNAMIC,
        collisionFilterGroup: App.physics.CGROUP_PLAYER,
        collisionFilterMask:  App.physics.CMASK_PLAYER
    });
    
    switch( this.levelId )
    {
        case 0:

            this.vehicle_body.mass = 1;
            
            this.vehicleCollider_L = new CANNON.Sphere( 0.24 );
            this.vehicleCollider_R = new CANNON.Sphere( 0.24 );
            this.vehicleCollider_B = new CANNON.Sphere( 0.5 );
            this.vehicleCollider_M = new CANNON.Box( new CANNON.Vec3( 0.5, 0.2, 0.5 ) );
            this.vehicle_body.addShape( this.vehicleCollider_L, new CANNON.Vec3( 0.24, 0.25, -0.4 ) );
            this.vehicle_body.addShape( this.vehicleCollider_R, new CANNON.Vec3( -0.24, 0.25, -0.4 ) );
            this.vehicle_body.addShape( this.vehicleCollider_B, new CANNON.Vec3( 0, 0.5, 0 ) );
            this.vehicle_body.collisionResponse = false;
            this.vehicle_body.fixedRotation = true;
            //this.vehicle_body.angularDamping = 0.3;
            this.vehicle_body.updateMassProperties();

            this.vehicle_body.addEventListener( "collide", App.level.onVehicleCollision.bind( App.level ) );
            App.physics.world.add( this.vehicle_body );    

            if ( this.debug )
            {        
                this.vehicleBodyDebug = new zen3d.Object3D();

                let mat1 = new zen3d.BasicMaterial();
                mat1.diffuse = new zen3d.Color3( 0x00FF00 );
                mat1.opacity = 0.3;
                mat1.transparent = true;

                let mat2 = new zen3d.BasicMaterial();
                mat2.diffuse = new zen3d.Color3( 0x0000FF );
                mat2.opacity = 0.3;
                mat2.transparent = true;

                let cubeGeo = new zen3d.CubeGeometry( 0.48, 0.5, 1.4, 1, 1, 1 );
                let sphereGeo = new zen3d.SphereGeometry( 0.24, 12, 12 );
                let s1 = new zen3d.Mesh( sphereGeo, mat1 );
                s1.position.set( -0.24, 0.25, -0.1 );
                let s2 = new zen3d.Mesh( sphereGeo, mat2 );
                s2.position.set( 0.24, 0.25, -0.1 );
                let s3 = new zen3d.Mesh( sphereGeo, mat1 );
                s3.position.set( 0, 0.5, 0 );
                this.vehicleBodyDebug.add( s1 );
                this.vehicleBodyDebug.add( s2 );
                this.vehicleBodyDebug.add( s3 );

                App.scene.add( this.vehicleBodyDebug );
            }
        break;
        
        case 1:

            this.vehicle_body.mass = 0;
            
            this.vehicleCollider_L = new CANNON.Box( new CANNON.Vec3( 0.4, 0.2, 0.25 ) );
            this.vehicleCollider_R = new CANNON.Box( new CANNON.Vec3( 0.4, 0.2, 0.25 ) );
            this.vehicleCollider_M = new CANNON.Box( new CANNON.Vec3( 0.2, 0.2, 1.0 ) ); // z: 1.1
            this.vehicle_body.addShape( this.vehicleCollider_L, new CANNON.Vec3( 0.6, 0.15, -0.6 ) );
            this.vehicle_body.addShape( this.vehicleCollider_R, new CANNON.Vec3( -0.6, 0.15, -0.6 ) );
            this.vehicle_body.addShape( this.vehicleCollider_M, new CANNON.Vec3( 0, 0, 0 ) ); // z: 0.15
            this.vehicle_body.collisionResponse = false;
            this.vehicle_body.fixedRotation = true;
            this.vehicle_body.updateMassProperties();

            this.vehicle_body.addEventListener( "collide", App.level.onVehicleCollision.bind( App.level ) );
            App.physics.world.add( this.vehicle_body );    

            if ( this.debug )
            {        
                this.vehicleBodyDebug = new zen3d.Object3D();

                let mat1 = new zen3d.BasicMaterial();
                mat1.diffuse = new zen3d.Color3( 0x00FF00 );
                mat1.opacity = 0.3;
                mat1.transparent = true;

                let mat2 = new zen3d.BasicMaterial();
                mat2.diffuse = new zen3d.Color3( 0x0000FF );
                mat2.opacity = 0.3;
                mat2.transparent = true;

                let cubeGeo = new zen3d.CubeGeometry( 1, 1, 1, 1, 1, 1 );
                
                let s1 = new zen3d.Mesh( cubeGeo, mat1 );
                s1.scale.set( 0.8, 0.4, 0.5 );
                s1.position.set( 0.6, 0.15, -0.6 );
                
                let s2 = new zen3d.Mesh( cubeGeo, mat1 );
                s2.scale.set( 0.8, 0.4, 0.5 );
                s2.position.set( -0.6, 0.15, -0.6 );
                
                let s3 = new zen3d.Mesh( cubeGeo, mat2 );
                s3.scale.set( 0.4, 0.4, 2.2 );
                s3.position.set( 0, 0, 0.15 );
                
                this.vehicleBodyDebug.add( s1 );
                this.vehicleBodyDebug.add( s2 );
                this.vehicleBodyDebug.add( s3 );

                App.scene.add( this.vehicleBodyDebug );
            }
        break;
        
        case 2:

            this.vehicle_body.mass = 1;
            
            let half_L = new CANNON.Vec3( 0.2, 0.5, 0.2 );
            let half_R = new CANNON.Vec3( 0.2, 0.5, 0.2 );
            let half_M = new CANNON.Vec3( 0.5, 0.5, 0.2 );
            
            let pos_L = new CANNON.Vec3( 0.35, 0.4, 0.5 );
            let pos_R = new CANNON.Vec3( -0.35, 0.4, 0.5 );
            let pos_M = new CANNON.Vec3( 0, 1.4, 0 );
            
            this.vehicleCollider_L = new CANNON.Box( half_L );
            this.vehicleCollider_R = new CANNON.Box( half_R );
            this.vehicleCollider_M = new CANNON.Box( half_M );
            this.vehicle_body.addShape( this.vehicleCollider_L, pos_L );
            this.vehicle_body.addShape( this.vehicleCollider_R, pos_R );
            this.vehicle_body.addShape( this.vehicleCollider_M, pos_M );
            this.vehicle_body.collisionResponse = false;
            this.vehicle_body.fixedRotation = true;
            this.vehicle_body.updateMassProperties();

            this.vehicle_body.addEventListener( "collide", App.level.onVehicleCollision.bind( App.level ) );
            App.physics.world.add( this.vehicle_body );

            if ( this.debug )
            {        
                this.vehicleBodyDebug = new zen3d.Object3D();

                let mat1 = new zen3d.BasicMaterial();
                mat1.diffuse = new zen3d.Color3( 0x00FF00 );
                mat1.opacity = 0.3;
                mat1.transparent = true;

                let mat2 = new zen3d.BasicMaterial();
                mat2.diffuse = new zen3d.Color3( 0x0000FF );
                mat2.opacity = 0.3;
                mat2.transparent = true;

                let cubeGeo = new zen3d.CubeGeometry( 1, 1, 1, 1, 1, 1 );
                
                let s1 = new zen3d.Mesh( cubeGeo, mat1 );
                s1.scale.set( half_L.x * 2, half_L.y * 2, half_L.z * 2 );
                s1.position.copy( pos_L );
                
                let s2 = new zen3d.Mesh( cubeGeo, mat1 );
                s2.scale.set( half_R.x * 2, half_R.y * 2, half_R.z * 2 );
                s2.position.copy( pos_R );
                
                let s3 = new zen3d.Mesh( cubeGeo, mat2 );
                s3.scale.set( half_M.x * 2, half_M.y * 2, half_M.z * 2 );
                s3.position.copy( pos_M );
                
                this.vehicleBodyDebug.add( s1 );
                this.vehicleBodyDebug.add( s2 );
                this.vehicleBodyDebug.add( s3 );

                App.scene.add( this.vehicleBodyDebug );
            }
        break;
        
        case 3:

            this.goldenWeaponBody = new CANNON.Body
            ({ 
                type: CANNON.Body.DYNAMIC,
                collisionFilterGroup: App.physics.CGROUP_PLAYER,
                collisionFilterMask:  App.physics.CMASK_PLAYER,
                mass: 1
            });
            
            let half = new CANNON.Vec3( 0.05, 0.1, 0.05 );
            let pos = new CANNON.Vec3( 0.0, 0.3, -0.1 );
            
            this.goldenWeaponCollider = new CANNON.Box( half );
            this.goldenWeaponBody.addShape( this.goldenWeaponCollider, pos );
            this.goldenWeaponBody.collisionResponse = false;
            this.goldenWeaponBody.fixedRotation = true;
            this.goldenWeaponBody.updateMassProperties();

            this.goldenWeaponBody.addEventListener( "collide", App.level.onGoldenWeaponCollision.bind( App.level ) );
            App.physics.world.add( this.goldenWeaponBody );

            if ( this.debug )
            {        
                this.goldenWeaponDebug = new zen3d.Object3D();

                let mat1 = new zen3d.BasicMaterial();
                mat1.diffuse = new zen3d.Color3( 0xFFFF00 );
                mat1.opacity = 0.3;
                mat1.transparent = true;

                let cubeGeo = new zen3d.CubeGeometry( 1, 1, 1, 1, 1, 1 );
                
                let s1 = new zen3d.Mesh( cubeGeo, mat1 );
                s1.scale.set( half.x * 2, half.y * 2, half.z * 2 );
                s1.position.copy( pos );
                
                this.goldenWeaponDebug.add( s1 );

                App.scene.add( this.goldenWeaponDebug );
            }
            
        break;
    };
   
    // create animMixer
    this.animMixer = new zen3d.AnimationMixer();
    this.timeline = obj.animations[0];
    this.timeline.name = "timeline";
    this.animMixer.add( this.timeline );
    
    // audio
    App.audio.create( "jump_1", App.loader.extract( App.level.jsonData.baseUrl + "audio/jump_1.ogg" ) );
    App.audio.create( "jump_2", App.loader.extract( App.level.jsonData.baseUrl + "audio/jump_2.ogg" ) );
    App.audio.create( "strafe", App.loader.extract( App.level.jsonData.baseUrl + "audio/strafe.ogg" ) );
   
    // ready    
    this.state = this.STATES.IDLE;
    this.body = this.minifigure_body;
    this.onReadyCallback();
}
// </editor-fold>

Player.prototype.play = function( id )  // <editor-fold defaultstate="collapsed">
{    
    this.currentAnim = id;
    
    this.timeline.frame = this.animations[id].start;
    this.timeline.startFrame = this.animations[id].start;
    this.timeline.endFrame = this.animations[id].end;
    this.timeline.loop = this.animations[id].loop;
    this.animMixer.play( "timeline", this.animations[id].start );
}
// </editor-fold>

Player.prototype.setState = function( state ) // <editor-fold defaultstate="collapsed">
{
    switch( state )
    {
        case this.STATES.IDLE:
            
            this.play( "IDLE" );
            this.facialAnim.DIE.pause();
            this.facialAnim.IDLE.play( 0 );
            
            this.body = this.minifigure_body;
            this.body.collisionResponse = true;
            this.vehicle_body.collisionResponse = false;
            
            this.body.shapeOffsets[1].y = 0.35;
            this.body.updateBoundingRadius();
            this.body.updateMassProperties();
            
            this.vehicleStateCount = 0;
            this.invincible = false;
            
        break;
        
        case this.STATES.RUNNING:

            this.play( "RUNNING" );
            
            this.body.shapeOffsets[1].y = 0.35;
            this.body.updateBoundingRadius();
            
            this.invincible = false;
        
        break;
        
        case this.STATES.STRAFE_L:

            this.play( "STRAFE_L" );
            App.audio.play( "strafe", false, 1, 1 );

        break;
        
        case this.STATES.STRAFE_R:

            this.play( "STRAFE_R" );
            App.audio.play( "strafe", false, 1, 1 );

        break;
        
        case this.STATES.JUMP:

            this.body.position.y += 0.2;
            this.body.velocity.y += 3.0;

            if ( Math.random() < 0.5 )
            {
                this.play( "JUMP_1" );
                App.audio.play( "jump_1" );
            }
            else
            {
                this.play( "JUMP_2" );
                App.audio.play( "jump_2" );
            }
            
            this.body.shapeOffsets[1].y = 0.35;
            this.body.updateBoundingRadius();
        
        break;
        
        case this.STATES.JUMP_ANIM_ONLY:

            this.play( "JUMP_2" );
            this.body.shapeOffsets[1].y = 0.35;
            this.body.updateBoundingRadius();
        
        break;
        
        case this.STATES.CROUCH:

            this.body.shapeOffsets[1].y = 0.05;
            this.body.updateBoundingRadius();
            this.play( "CROUCH" );
            App.audio.play( "strafe", false, 1, 0.8 );
            
        break;
        
        case this.STATES.DIE:

            if ( this.state === this.STATES.DIE ) return;
            
            this.play( "DIE_1" );
            this.facialAnim.IDLE.pause();
            this.facialAnim.DIE.play( 0 );
            
            this.body.shapeOffsets[1].y = 0.35;
            this.body.updateBoundingRadius();
            
        break;
        
        case this.STATES.TRANSFORM:

            this.body.collisionResponse = false;
            this.body = this.vehicle_body;
            this.body.collisionResponse = true;
            this.body.updateMassProperties();
            
            this.vehicleStateCount = this.vehicleMaxDuration;
            this.vehicle.visible = this.vehicle_bg.visible = true;
            
            if ( this.levelId === 0 )
            {
                this.dustTarget.set( 0, 0, 0 );
            }
            else if ( this.levelId === 1 )
            {
                this.dustTarget.set( 0, 0, -0.8 );
            }

            this.play( "TRANSFORM" );
            
        break;
        
        case this.STATES.VEHICLE:

            this.play( "VEHICLE" );
            this.invincible = false;
            
        break;
        
        case this.STATES.VEHICLE_L:

            if ( this.levelId === 0 )
            {
                this.play( "VEHICLE_L" );
            }            
            else if ( this.levelId === 1 )
            {
                this.play( "VEHICLE_L" );
                this.addRotation( 0.4, 1, 0, 0, -0.7 );
            }
            else if ( this.levelId === 2 )
            {
                //this.play( "VEHICLE_L" );
                this.state = this.STATES.VEHICLE;
            }
            
        break;
        
        case this.STATES.VEHICLE_R:
            
            if ( this.levelId === 0 )
            {
                this.play( "VEHICLE_R" );
            }            
            else if ( this.levelId === 1 )
            {
                this.play( "VEHICLE_R" );
                this.addRotation( 0.4, 1, 0, 0, 0.7 );
            }
            else if ( this.levelId === 2 )
            {
                //this.play( "VEHICLE_R" );
                this.state = this.STATES.VEHICLE;
            }
            
        break;
        
        case this.STATES.VEHICLE_DOWN:
            
            this.play( "VEHICLE_DOWN" );
            this.vehicle_body.shapeOffsets[2].y = 0.8;
            this.vehicle_body.updateBoundingRadius();
            this.vehicle_body.updateMassProperties();
            
        break;
        
        case this.STATES.VEHICLE_UP:
            
            this.play( "VEHICLE_UP" );
            this.vehicle_body.shapeOffsets[2].y = 0.8;
            this.vehicle_body.updateBoundingRadius();
            this.vehicle_body.updateMassProperties();
            this.invincible = true;
            
        break;
        
        case this.STATES.TRANSFORM_REVERSE:

            if ( this.levelId === 0 )
            {
                this.minifigure_body.position.copy( this.vehicle_body.position );
            }
            else if ( this.levelId === 1 )
            {
                this.minifigure_body.position.copy( this.vehicle_body.position );
            }
            else if ( this.levelId === 2 )
            {
                this.minifigure_body.position.x = this.vehicle_body.position.x;
                this.minifigure_body.position.y = this.vehicle_body.position.y + 1;
                this.minifigure_body.position.z = this.vehicle_body.position.z;
                this.display.position.y = this.minifigure_body.position.y;
            }
            
            this.body.collisionResponse = false;
            this.body = this.minifigure_body;
            this.body.collisionResponse = true;
            this.body.updateMassProperties();

            this.vehicle.visible = this.vehicle_bg.visible = false;
            this.display.visible = true;
            
            this.dustTarget.set( 0, 0, 0 );
            
            this.play( "RUNNING" );
            this.setState( this.STATES.RUNNING );
            
        break;
        
        case this.STATES.DRAW_GOLDEN_WEAPON:

            this.transform_bg.visible = true;
            this.play( "GOLDEN_WEAPON_DRAW" );
            
        break;
        
        case this.STATES.GOLDEN_WEAPON:

            this.transform_bg.visible = false;
            this.play( "RUNNING" );
            
        break;
        
        case this.STATES.STRIKE_GOLDEN_WEAPON:

            if ( this.state === state )
            {
                if ( this.STATECOUNT[ this.STATES.STRIKE_GOLDEN_WEAPON ] < 1 )
                {
                    break;
                };
            };

            this.STATECOUNT[ this.STATES.STRIKE_GOLDEN_WEAPON ] = 0;
            gsap.to( this.goldenGlow.display.scale, 0.3, { ease: Sine.easeOut, x: 3, y: 3, z: 3 } );
            gsap.to( this.goldenGlow.display.scale, 1, { ease: Sine.easeInOut, x: 0, y: 0, z: 0, delay: 0.4 } );
            this.play( "GOLDEN_WEAPON_STRIKE" );
            
        break;
        
        case this.STATES.CHEER:

            this.goldenWeapon_Backpack.visible = false;
            this.goldenWeapon.visible = true;
            this.play( "CHEER" );
            
        break;
    }

    this.state = state;
}
// </editor-fold>

Player.prototype.onUpdate = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    if ( this.state === this.STATES.INIT ) return;
    
    // statecount
    if ( this.state !== this.lastState ) 
    {
        this.STATECOUNT[ this.state ] = 0;
        this.lastState = this.state;
    }
    this.STATECOUNT[ this.state ] += deltaTime;
    let statecount = this.STATECOUNT[ this.state ];
    
    // update animation
    this.animMixer.fastUpdate( deltaTime );

    // update display position & quaternion    
    this.display.position.x = this.worldPos.x;
    this.display.position.y = this.body.position.y;
    this.display.position.z = this.worldPos.z;    
    this.display.quaternion.copy( this.body.quaternion );
    
    // break if dead
    if ( this.state === this.STATES.DIE ) return;

    // state switch
    
    switch( this.state )
    {
        case this.STATES.STRAFE_L:

            if ( statecount > this.animations.STRAFE_L.len )
            {
                this.setState( this.STATES.RUNNING );
            }
            
        break;
        
        case this.STATES.STRAFE_R:

            if ( statecount > this.animations.STRAFE_R.len )
            {
                this.setState( this.STATES.RUNNING );
            }
            
        break;
        
        case this.STATES.CROUCH:

            if ( statecount > this.animations.CROUCH.len )
            {
                this.setState( this.STATES.RUNNING );
                this.level.input.unlock();
            }
        
        break;
        
        case this.STATES.VEHICLE:
            
            this.updateVehicleParts( deltaTime );
        
        break;
        
        case this.STATES.VEHICLE_R:
            
            this.updateVehicleParts( deltaTime );
            
            if ( statecount > this.animations.VEHICLE_R.len ) this.setState( this.STATES.VEHICLE );
            
        break;
        
        case this.STATES.VEHICLE_L:
            
            this.updateVehicleParts( deltaTime );
            if ( statecount > this.animations.VEHICLE_L.len ) this.setState( this.STATES.VEHICLE );
            
        break;
        
        case this.STATES.VEHICLE_DOWN:
            
            this.updateVehicleParts( deltaTime );            
            if ( statecount > this.animations.VEHICLE_DOWN.len )
            {
                this.vehicle_body.shapeOffsets[2].y = 1.4;
                this.vehicle_body.updateBoundingRadius();
                this.vehicle_body.updateMassProperties();
                this.setState( this.STATES.VEHICLE );
            }
            
        break;
        
        case this.STATES.VEHICLE_UP:
            
            this.updateVehicleParts( deltaTime );
            
            console.log( this.level.speed )
            
            if ( statecount > this.animations.VEHICLE_UP.len )
            {
                this.vehicle_body.shapeOffsets[2].y = 1.4;
                this.vehicle_body.updateBoundingRadius();
                this.vehicle_body.updateMassProperties();
                this.setState( this.STATES.VEHICLE );
            }
            
        break;
        
        case this.STATES.DRAW_GOLDEN_WEAPON:
            
            // fade in golden glow
            this.setGoldFactor( Math.min( statecount, 1 ) );
            
            // hide backpack weapon and show hand weapon
            if ( statecount > 0.26 )
            {
                this.goldenWeapon.visible = true;
                this.goldenWeapon_Backpack.visible = false;
            }
            
        break;
        
        case this.STATES.STRIKE_GOLDEN_WEAPON:

            let weaponWorldPos = new zen3d.Vector3().copy( this.localPos ).add( this.goldenWeapon.position );
            let weaponWorldQuat = new zen3d.Quaternion().copy( this.goldenWeapon.quaternion ).premultiply( this.level.path.quaternion );
            weaponWorldPos.applyQuaternion( this.level.path.quaternion ).add( this.level.path.position );
            this.goldenWeaponBody.position.copy( weaponWorldPos );
            this.goldenWeaponBody.quaternion.copy( weaponWorldQuat );
            
            // golden glow
            this.goldenGlow.onUpdate( deltaTime );

            if ( this.debug )
            {
                this.goldenWeaponDebug.position.copy( this.goldenWeaponBody.position );
                this.goldenWeaponDebug.quaternion.copy( this.goldenWeaponBody.quaternion );
            }
            
            if ( statecount > this.animations.GOLDEN_WEAPON_STRIKE.len ) this.setState( this.STATES.RUNNING );
            
        break;
    }
    
    // blink
    
    if ( this.blinkCount > 0 )
    {
        this.blinkCount -= 0.016;        
        this.display.visible = ( this.blinkCount % this.blinkInterval > this.blinkInterval * 0.5 );
    }
    else
    {
        this.display.visible = true;
    }
    
    // debug

    if ( this.debug )
    {
        if ( this.state >= this.STATES.IDLE && this.state <= this.STATES.DIE )
        {
            this.minifigureBodyDebug.position.copy( this.body.position );
            this.minifigureBodyDebug.quaternion.copy( this.body.quaternion );
            this.minifigureBodyDebug.children[0].position.copy( this.minifigure_body.shapeOffsets[0] );
            this.minifigureBodyDebug.children[1].position.copy( this.minifigure_body.shapeOffsets[1] );
            this.minifigureBodyDebug.visible = true;
            if ( this.vehicleBodyDebug ) this.vehicleBodyDebug.visible = false;
        }
        
        if ( this.state >= this.STATES.VEHICLE && this.state <= this.STATES.VEHICLE_R )
        {
            this.vehicleBodyDebug.position.copy( this.body.position );
            this.vehicleBodyDebug.quaternion.copy( this.body.quaternion );
            this.minifigureBodyDebug.visible = false;
            if ( this.vehicleBodyDebug ) this.vehicleBodyDebug.visible = true;
        }
    }
}
// </editor-fold>

Player.prototype.updateVehicleParts = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    if ( this.levelId === 0 )
    {
        this.turretEuler += deltaTime * 4;
        this.turret.euler.y = Math.sin( this.turretEuler ) * 0.1;
    }
    else if ( this.levelId === 1 )
    {
        this.turret.euler.z += deltaTime * 8;
    }
    /*
    else if ( this.levelId === 2 )
    {
        this.body.shapeOffsets[0].y = this.L_Lower_Leg.position.y;
        this.body.shapeOffsets[1].y = this.R_Lower_Leg.position.y;
        this.body.updateBoundingRadius();
        
        if ( this.debug )
        {
            this.vehicleBodyDebug.children[0].position.y = this.L_Lower_Leg.position.y;
            this.vehicleBodyDebug.children[1].position.y = this.R_Lower_Leg.position.y;
        }
    }
    */
   
    this.shotCooldownCount += deltaTime;
    if ( this.shotCooldownCount > this.shotCooldownTime ) this.shoot();
}
// </editor-fold>

Player.prototype.addRotation = function( fadein, fadeout, x, y, z ) // <editor-fold defaultstate="collapsed">
{
    gsap.to( this.vehicleRotationRoot.euler, fadein, { ease: Sine.easeOut, x: x, y: y, z: z } );
    gsap.to( this.vehicleRotationRoot.euler, fadeout, { ease: "blaster_swingback", x: 0, y: 0, z: 0, delay: fadein } );
}
// </editor-fold>

Player.prototype.addTranslation = function( fadein, fadeout, x, y, z ) // <editor-fold defaultstate="collapsed">
{
    gsap.to( this.vehicleRotationRoot.position, fadein, { ease: Sine.easeOut, x: x, y: y, z: z } );
    gsap.to( this.vehicleRotationRoot.position, fadeout, { ease: "blaster_swingback", x: 0, y: 0, z: 0, delay: fadein } );
}
// </editor-fold>

Player.prototype.shoot = function() // <editor-fold defaultstate="collapsed">
{
    // delay for next shot
    this.shotCooldownCount = 0;
    
    // get next free mesh
    this.currentShot++;    
    if ( this.currentShot >= this.shots.length ) this.currentShot = 0;

    // start shot
    
    if ( this.levelId === 0 )
    {
        this.currentShooterSide = - this.currentShooterSide;
        this.shotOrigin.set( this.currentShooterSide * 0.15, 0.09, -0.04 );
        this.shotOrigin.applyMatrix4( this.turret.parent.worldMatrix );
        this.shotDirection = this.turret.getWorldDirection();
        this.shotDirection.y -= Math.random() * 0.05;
        this.shotDirection.multiplyScalar( - this.shotVelocity );
    }
    else if ( this.levelId === 1 )
    {
        this.currentShooterSide = - this.currentShooterSide;
        this.shotOrigin.set( this.currentShooterSide * 0.25, 0.25, 0.0 );
        this.shotOrigin.applyMatrix4( this.turret.parent.worldMatrix );        
        this.shotDirection = this.turret.getWorldDirection();
        this.shotDirection.y -= Math.random() * 0.05;
        this.shotDirection.multiplyScalar( this.shotVelocity );
    }
    
    this.shots[ this.currentShot ].start( this.shotOrigin, this.shotDirection );
}
// </editor-fold>

Player.prototype.getShapeWorldPos = function( shape ) // <editor-fold defaultstate="collapsed">
{
    let pos = new zen3d.Vector3();
    let i = 0;
    
    for ( i; i < this.body.shapes.length; i++ )
    {
        if ( this.body.shapes[i] === shape )
        {
            pos.copy( this.body.shapeOffsets[i] );
            break;
        }
    }
    
    pos.add( this.body.position );
    
    return pos;
}
// </editor-fold>

Player.prototype.setGoldFactor = function( value ) // <editor-fold defaultstate="collapsed">
{
    let len = this.material_uniforms.length;
    
    for ( let i = 0; i < len; i++ )
    {
        this.material_uniforms[i].gold = value;
    }
    
    this.goldenGlow.mat.opacity = value;
}
// </editor-fold>

Player.prototype.destroy = function() // <editor-fold defaultstate="collapsed">
{
    this.state = this.STATES.UNLOAD;
    
    // scene
    AppUtils.destroyScene( this.display );
    
    // delete this.props
    for( let p in this )
    {
        if ( p !== "destroy" )
        {
            this[ p ] = undefined;
        }
    }
}
// </editor-fold>