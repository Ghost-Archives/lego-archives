


function Chen( level, onReadyCallback ) // <editor-fold defaultstate="collapsed">
{
    // store parent
    this.level = level;
    this.levelId = this.level.jsonData.id;
    this.onReadyCallback = onReadyCallback;
    this.app = this.level.app;
    
    // props
    this.debug = false;
    this.time = 0;
    this.enginePower = [ 3, 3, 3, 3 ];
    this.enginePowerbarColors = 
    [
        new zen3d.Color3( 0x000000 ),
        new zen3d.Color3( 0xCC2200 ),
        new zen3d.Color3( 0xFFCC00 ),
        new zen3d.Color3( 0x33FF00 )
    ]
    this.engineEulers = [];
    this.overallPower = 12;
    
    this.blinkCount = 0;
    this.blinkInterval = 0.2;
    this.blinkingEngine;
    
    this.attackMode = 0;
    this.attackRotation = 0;
    
    
    this.halfPI = Math.PI * 0.5;
    
    this.lerpPos = 1;
    this.lerpSin = 1;
    this.sway = 0.1;
    this.localPos = new zen3d.Vector3();
    this.worldPos = new zen3d.Vector3();
    this.localEuler = new zen3d.Euler();
    this.localQuat = new zen3d.Quaternion();
    this.worldQuat = new zen3d.Quaternion();    
    this.localToWorld = new zen3d.Vector3();
    
    // state
    
    this.STATES = 
    {
        INIT:                   0,
        READY:                  1,
        AWAY:                   2,
        APPEAR:                 3,
        IDLE:                   4,
        ATTACK:                 5,
        STAFF_ATTACK:           6,
        STAFF_ATTACK_SHOOT:     7,
        STAFF_ATTACK_END:       8,
        HIT:                    9,
        RETREAT:                10,
        DIE:                    11,
        DEAD:                   12,
        UNLOAD:                 30
    };
    
    this.STATECOUNT = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
    
    this.state = this.lastState = this.STATES.INIT;
    
    // animations
    
    this.animations = 
    {
        APPEAR: 
        { 
            start:  1 / 30,
            end:    30 / 30,
            len:    30 / 30,
            loop:   false
        },
        IDLE: 
        { 
            start:  145 / 30,
            end:    190 / 30,
            len:    46 / 30,
            loop:   true
        },
        ATTACK: 
        { 
            start:  195 / 30,
            end:    214 / 30,
            len:    20 / 30,
            loop:   false
        },
        STAFF_ATTACK: 
        { 
            start:  35 / 30,
            end:    100 / 30,
            len:    76 / 30,
            loop:   false
        },
        HIT: 
        { 
            start:  105 / 30,
            end:    140 / 30,
            len:    36 / 30,
            loop:   false
        },
        DIE: 
        { 
            start:  220 / 30,
            end:    260 / 30,
            len:    41 / 30,
            loop:   true
        }       
    };
    
    this.currentAnim = "";
   
    // create materials
    
    let rimlight = 
    {
        position: new zen3d.Vector3( this.level.jsonData.rimLightPos.x, this.level.jsonData.rimLightPos.y, this.level.jsonData.rimLightPos.z ).normalize(),
        color: new zen3d.Color3( this.level.jsonData.rimLightColor )
    };
    
    let baseUrl = this.level.jsonData.baseUrl;
    
    this.minifigure_material = new FastPbrMaterial( "minifigure", baseUrl + "chen/chen", rimlight, "front", level.envMap );
    this.face_mat = new FaceMaterial( baseUrl + 'chen/face.png', { tileW: 256, tileH: 256, texW: 512, texH: 512 }, level.envMap );
    this.vehicle_material = new DeNormMaterial( "vehicle", baseUrl + "chen/chen_vehicle", level.envMap, 1 );
    this.lightning_material = new UnlitMaterial( "lightning", baseUrl + "chen/lightning_strike_aa.png" );
    this.lightning_material.transparent = true;
    this.lightning_material.depthTest = true;
    this.lightning_material.depthWrite = true;
    this.lightning_material.side = "double";
    this.lightning_material.blending = zen3d.BLEND_TYPE.ADD;
    
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
    
    console.log( "level_3/chen" );
    
    // create object
    var data = App.loader.extract( baseUrl + 'chen/chen.glb' );
    this.loader = new zen3d.GLTFLoader();
    this.loader.load( data, this.onLoadingComplete.bind( this ), undefined, undefined, [ this.minifigure_material, this.face_mat, this.vehicle_material, this.lightning_material ] );
}
// </editor-fold>

Chen.prototype.onLoadingComplete = function( obj ) // <editor-fold defaultstate="collapsed">
{
    // store display references
    
    this.display = new zen3d.Object3D();
    this.rotationRoot = new zen3d.Object3D();
    this.minifigure = AppUtils.getAllObjects( obj.scene.children, "MINIFIGURE", "", false )[0];
    this.vehicle = AppUtils.getAllObjects( obj.scene.children, "VEHICLE", "", false )[0];
    this.propellers = AppUtils.getAllObjects( this.vehicle, "propeller", "mesh" );
    this.big_propeller = this.propellers.shift();
    this.engines = 
    [
        AppUtils.getAllObjects( this.vehicle, "engine_1", "" )[0],
        AppUtils.getAllObjects( this.vehicle, "engine_2", "" )[0],
        AppUtils.getAllObjects( this.vehicle, "engine_3", "" )[0],
        AppUtils.getAllObjects( this.vehicle, "engine_4", "" )[0]
    ]
    
    // vehicle animation
    this.propellerEuler = new zen3d.Euler();
    this.rotationHelper = new zen3d.Object3D();
    
    // add to display
    this.display.add( this.rotationRoot );
    this.rotationRoot.add( this.minifigure );
    this.rotationRoot.add( this.vehicle );
    
    // setup shadow & culling    
    this.allDisplays = AppUtils.getAllObjects( this.display.children, "", "" );
    let len = this.allDisplays.length;
    let i = 0;
    
    for ( i = 0; i < len; i++ )
    {
        this.allDisplays[i].castShadow = false;
        this.allDisplays[i].receiveShadow = true;
        this.allDisplays[i].frustumCulled = false;
    }
    
    // create energy bars
    this.enginePowerbars = [];
    let geo = new BillboardGeometry( 0.2, 0.03 );
    let bar;
    let powerbar_mat;
    
    for ( i = 0; i < 4; i++ )
    {
        powerbar_mat = new BillboardMaterial( undefined, new zen3d.Color3( 0x33CC00 ) );
        bar = new zen3d.Mesh( geo, powerbar_mat );
        bar.position.set( 0.0, 0.25, 0.2 )

        this.engines[i].add( bar );
        this.enginePowerbars.push( bar );
        
        this.engineEulers.push( new zen3d.Euler().copy( this.engines[i].euler ) );
    }
    
    // smoke
    
    this.smokes = [];
    let smoke;
    
    for ( i = 0; i < 4; i++ )
    {
        smoke = new AdvancedParticleSystem
        ({
            count: 30,
            repeat: 1000000,
            gravity: new zen3d.Vector3( 0, 0, 0.7 ),
            texUrl: this.level.jsonData.baseUrl + "fx/dust.png",

            uvTransform:
            {
                offset: { x: 0, y: 0 },
                scale: { x: 1, y: 1 }
            },

            emitter:
            {
                size: new zen3d.Vector3( 0.05, 0.0, 0.05 )
            },

            lifetime:
            {
                min: 1,
                max: 2
            },

            offset:
            {
                min: 0.001,
                max: 0.002
            },

            velocity: 
            { 
                min: new zen3d.Vector3( 0, 0.4, 0 ),
                max: new zen3d.Vector3( 0, 0.8, 0 )
            },

            alpha:
            {
                min: 0.6,
                max: 0.9
            },

            scale:
            {
                birth:
                {
                    min: 0.15,
                    max: 0.2
                },
                death:
                {
                    min: 2.5,
                    max: 3
                }
            },
            colorOverLife:
            [
                { time: 0.0, color: new zen3d.Color3( "0xFFFFFF" ) },
                { time: 0.1, color: new zen3d.Color3( "0xFFFF00" ) },
                { time: 0.15, color: new zen3d.Color3( "0xFF0000" ) },
                { time: 0.35, color: new zen3d.Color3( "0x666666" ) }
            ],
            alphaOverLife:
            [
                { time: 0, alpha: 0 },
                { time: 0.05, alpha: 1 },
                { time: 0.3, alpha: 1 },
                { time: 1, alpha: 0 }
            ],
            rotation:
            {
                min: 1,
                max: 2
            },
            wiggle:
            {
                amplitude: new zen3d.Vector3( 0.1, 0, 0.1 ),
                frequency:
                {
                    min: 1,
                    max: 2
                }
            }
        });
        smoke.display.position.copy( this.engines[i].position );
        smoke.mat.opacity = 0;
        this.rotationRoot.add( smoke.display );
        smoke.setStartTime( 1 );
        this.smokes.push( smoke );
    }

    // create CANNON Body
    
    this.body = new CANNON.Body
    ({ 
        type: CANNON.Body.DYNAMIC,
        collisionFilterGroup: App.physics.CGROUP_STATIC,
        collisionFilterMask:  App.physics.CMASK_STATIC,
        mass: 0
    });

    this.engine_1_collider = new CANNON.Box( new CANNON.Vec3( 0.15, 0.15, 0.25 ) );
    this.body.addShape( this.engine_1_collider, new CANNON.Vec3( 0.0, 0.05, 0.5 ) );
    this.engine_2_collider = new CANNON.Box( new CANNON.Vec3( 0.25, 0.15, 0.15 ) );
    this.body.addShape( this.engine_2_collider, new CANNON.Vec3( 0.5, 0.05, 0.0 ) );
    this.engine_3_collider = new CANNON.Box( new CANNON.Vec3( 0.15, 0.15, 0.25 ) );
    this.body.addShape( this.engine_3_collider, new CANNON.Vec3( 0.0, 0.05, -0.5 ) );
    this.engine_4_collider = new CANNON.Box( new CANNON.Vec3( 0.25, 0.15, 0.15 ) );
    this.body.addShape( this.engine_4_collider, new CANNON.Vec3( -0.5, 0.05, 0.0 ) );
    
    this.body.collisionResponse = false;
    this.body.fixedRotation = true;
    this.body.updateMassProperties();
    this.enabled = true;
    this.type = ECS.TYPE.CHEN;
    this.body.entity = this;

    //this.body.addEventListener( "collide", App.level.onCollision.bind( App.level ) );
    App.physics.world.add( this.body );

    if ( this.debug )
    {        
        this.bodyDebug = new zen3d.Object3D();

        let mat1 = new zen3d.BasicMaterial();
        mat1.diffuse = new zen3d.Color3( 0xFF0000 );
        mat1.opacity = 0.3;
        mat1.transparent = true;

        let mat2 = new zen3d.BasicMaterial();
        mat2.diffuse = new zen3d.Color3( 0xFFFF00 );
        mat2.opacity = 0.3;
        mat2.transparent = true;
        
        let mat3 = new zen3d.BasicMaterial();
        mat3.diffuse = new zen3d.Color3( 0x00FF00 );
        mat3.opacity = 0.3;
        mat3.transparent = true;
        
        let mat4 = new zen3d.BasicMaterial();
        mat4.diffuse = new zen3d.Color3( 0x0000FF );
        mat4.opacity = 0.3;
        mat4.transparent = true;

        let cubeGeo = new zen3d.CubeGeometry( 1, 1, 1, 1, 1, 1 );
        let halfExtents;
        let offset;
        
        halfExtents = this.engine_1_collider.halfExtents;
        offset = this.body.shapeOffsets[0];
        let e1 = new zen3d.Mesh( cubeGeo, mat1 );
        e1.scale.set( halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2 );
        e1.position.set( offset.x, offset.y, offset.z );
        this.bodyDebug.add( e1 );
        
        halfExtents = this.engine_2_collider.halfExtents;
        offset = this.body.shapeOffsets[1];
        let e2 = new zen3d.Mesh( cubeGeo, mat2 );
        e2.scale.set( halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2 );
        e2.position.set( offset.x, offset.y, offset.z );
        this.bodyDebug.add( e2 );
        
        halfExtents = this.engine_3_collider.halfExtents;
        offset = this.body.shapeOffsets[2];
        let e3 = new zen3d.Mesh( cubeGeo, mat3 );
        e3.scale.set( halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2 );
        e3.position.set( offset.x, offset.y, offset.z );
        this.bodyDebug.add( e3 );
        
        halfExtents = this.engine_4_collider.halfExtents;
        offset = this.body.shapeOffsets[3];
        let e4 = new zen3d.Mesh( cubeGeo, mat4 );
        e4.scale.set( halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2 );
        e4.position.set( offset.x, offset.y, offset.z );
        this.bodyDebug.add( e4 );

        App.scene.add( this.bodyDebug );
    }
   
    // create animMixer
    this.animMixer = new zen3d.AnimationMixer();
    this.timeline = obj.animations[0];
    this.timeline.name = "timeline";
    this.animMixer.add( this.timeline );
    
    // create staff shot
    this.shot = new ECS.StaffShot( true );
    
    // audio
    App.audio.create( "chens_vehicle", App.loader.extract( App.level.jsonData.baseUrl + "audio/chens_vehicle.ogg" ) );
    App.audio.create( "chen_hit", App.loader.extract( App.level.jsonData.baseUrl + "audio/chen_hit.ogg" ) );
    App.audio.create( "chen_dies", App.loader.extract( App.level.jsonData.baseUrl + "audio/chen_dies.ogg" ) );
    App.audio.create( "chen_shot", App.loader.extract( App.level.jsonData.baseUrl + "audio/chen_shot.ogg" ) );
    
    // ready    
    this.setState( this.STATES.READY );
    this.onReadyCallback();
}
// </editor-fold>

Chen.prototype.setState = function( state ) // <editor-fold defaultstate="collapsed">
{
    switch( state )
    {
        case this.STATES.READY:

            this.localPos.y =
            this.body.position.y =
            this.display.position.y = 5;
    
            this.app.audio.stop( "chens_vehicle" );
            
        break;
        
        case this.STATES.IDLE:
            
            this.play( "IDLE" );

        break;
        
        case this.STATES.APPEAR:
            
            this.localPos.z = 10;
            this.localPos.y = 5;
            this.lerpPos = 1;
            gsap.to( this.localPos, 2, { ease: Sine.easeInOut, y: 0.5, z: 0 } );
            
            this.play( "APPEAR" );
            
            this.app.audio.play( "chens_vehicle", true );
            
        break;
        
        case this.STATES.ATTACK:
            
            // select random lane for each attack
            let randomTrack = Math.round( Math.random() * 2 ) - 1;
            randomTrack *= 0.55;

            // set random rotation for each attack
            let randomRotation = Math.floor( Math.random() * 4 ) * this.halfPI;
            
            // animate position
            gsap.to( this.localEuler, 1, { ease: Sine.easeInOut, y: randomRotation } );
            gsap.to( this.localPos, 1, { ease: Sine.easeInOut, x: randomTrack, y: 0.2, z: 0 } );
            gsap.to( this, 1, { ease: Sine.easeInOut, lerpPos: 0.15, lerpSin: 0 } );
            gsap.to( this.localEuler, 1, { ease: Sine.easeInOut, y: 0, delay: 2 } );
            gsap.to( this.localPos, 1, { ease: Sine.easeInOut, x: 0, y: 0.8, z: 0, delay: 2 } );
            gsap.to( this, 1, { ease: Sine.easeInOut, lerpPos: 1, lerpSin: 1, delay: 2 } );
            
            this.play( "ATTACK" );
            
        break;
        
        case this.STATES.STAFF_ATTACK:

            gsap.to( this, 1, { ease: Sine.easeInOut, lerpSin: 0 } );
            gsap.to( this.localPos, 2, { ease: Sine.easeInOut, y: 1 } );
            
            this.play( "STAFF_ATTACK" );
            
            this.app.audio.play( "chen_shot" );
            
        break;
        
        case this.STATES.STAFF_ATTACK_SHOOT:
            
            let origin = new zen3d.Vector3().copy( this.body.position );
            origin.y += 1;
            this.shot.start( origin );
            
            // reset state
            gsap.to( this.localPos, 1, { ease: Sine.easeInOut, x: 0, y: 0.8, z: 0 } );
            gsap.to( this, 1, { ease: Sine.easeInOut, lerpPos: 1, lerpSin: 1 } );

        break;
        
        case this.STATES.STAFF_ATTACK_END:
            
        break;
        
        case this.STATES.HIT:

            this.play( "HIT" );
            this.app.audio.play( "chen_hit" );

        break;
        
        case this.STATES.RETREAT:

            gsap.to( this.localPos, 3, { ease: Sine.easeIn, y: 5, z: 10 } );
            this.app.audio.stop( "chens_vehicle" );

        break;
        
        case this.STATES.DIE:

            let timeline = gsap.timeline( { paused: true } );
            timeline.to( this, 2, { ease: Sine.easeIn, lerpSin: 2 }, 0 );
            timeline.to( this, 4, { ease: Sine.easeInOut, lerpPos: 4 }, 0 );
            timeline.to( this.localEuler, 4, { ease: Sine.easeIn, y: 40 }, 0 );
            timeline.to( this.localPos, 4, { ease: Sine.easeInOut, y: 7 }, 0 );
            timeline.play();
            
            this.play( "DIE" );
            this.app.audio.stop( "chens_vehicle" );
            this.app.audio.play( "chen_dies" );

        break;
        
        case this.STATES.DEAD:

            this.display.visible = false;            
            this.app.audio.stop( "chens_vehicle" );

        break;
    }

    this.state = state;
}
// </editor-fold>

Chen.prototype.play = function( id )  // <editor-fold defaultstate="collapsed">
{    
    this.currentAnim = id;
    
    this.timeline.frame = this.animations[id].start;
    this.timeline.startFrame = this.animations[id].start;
    this.timeline.endFrame = this.animations[id].end;
    this.timeline.loop = this.animations[id].loop;
    this.animMixer.play( "timeline", this.animations[id].start );
}
// </editor-fold>

Chen.prototype.onUpdate = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    if ( this.state === this.STATES.INIT ) return;
    if ( this.state === this.STATES.DEAD ) return;
    
    // statecount
    if ( this.state !== this.lastState ) 
    {
        this.STATECOUNT[ this.state ] = 0;
        this.lastState = this.state;
    }
    this.STATECOUNT[ this.state ] += deltaTime;
    let statecount = this.STATECOUNT[ this.state ];
    
    // state switch
    
    switch( this.state )
    {
        case this.STATES.IDLE:

            if ( statecount > 2 )
            {
                if ( this.attackMode < 2 )
                {
                    this.setState( this.STATES.ATTACK );
                   
                    if ( Math.random() < 0.5 )
                    {
                        this.attackMode += 1;
                    }
                    else
                    {
                        this.attackMode += 2;
                    }
                }
                else
                {
                    this.setState( this.STATES.STAFF_ATTACK );
                    this.attackMode = 0;
                }
            }
            
        break;
        
        case this.STATES.ATTACK:
            
            if ( statecount > 3 )
            {
                this.setState( this.STATES.IDLE );
            }
            
        break;
        
        case this.STATES.STAFF_ATTACK:
            
            if ( statecount > 1.2 )
            {
                this.setState( this.STATES.STAFF_ATTACK_SHOOT );
            }
            
        break;
        
        case this.STATES.STAFF_ATTACK_SHOOT:

            this.setState( this.STATES.STAFF_ATTACK_END );
            
        break;

        case this.STATES.STAFF_ATTACK_END:
            
            if ( statecount > 1 )
            {
                this.setState( this.STATES.IDLE );
            }
            
        break;
        
        case this.STATES.HIT:
            
            if ( statecount > 3 )
            {
                this.setState( this.STATES.IDLE );
            }
            
        break;
        
        case this.STATES.RETREAT:
            
            if ( statecount > 3 )
            {
                this.setState( this.STATES.READY );
            }
            
        break;
        
        case this.STATES.DIE:

            if ( statecount > 4 )
            {
                this.setState( this.STATES.DEAD );
            }
            
        break;
    };
    
    // body animation    
    this.time += deltaTime;
    this.sin = Math.sin( this.time );
    this.sin2 = Math.sin( 1 + this.time * 2 );
    this.cos2 = Math.cos( 1 + this.time * 2 );
    
    // hover animation
    this.localPos.y += this.sin2 * 0.01 * this.lerpSin;
    this.rotationRoot.euler.x = this.cos2 * this.sway;
    this.rotationRoot.euler.z = this.sin2 * this.sway;
    
    let i = 0;
    
    // propeller anim
    this.propellerEuler.y += deltaTime * 20;
    
    for( i; i < 4; i++ )
    {
        if ( this.enginePower[i] > 0 ) this.propellers[i].euler.y = this.propellerEuler.y;
    }
    
    this.big_propeller.euler.y += deltaTime * 15;
    
    // engine blink
    if ( this.blinkingEngine )
    {
        this.blinkCount -= 0.016;        
        this.blinkingEngine.visible = ( this.blinkCount % this.blinkInterval > this.blinkInterval * 0.5 );
        if ( this.blinkCount < 0 )
        {
            this.blinkingEngine.visible = true;
            this.blinkingEngine = undefined;
        }
    }
    
    // fx
    for ( i = 0; i < 4; i++ )
    {
        this.smokes[i].onUpdate( deltaTime );
    }
    
    // compute world pos
    let oneMinusLerp = 1.0 - this.lerpPos;
    this.worldPos.x = this.level.path.position.x * oneMinusLerp + this.level.camLookAt.position.x * this.lerpPos;
    this.worldPos.y = this.level.path.position.y * oneMinusLerp + this.level.camLookAt.position.y * this.lerpPos;
    this.worldPos.z = this.level.path.position.z * oneMinusLerp + this.level.camLookAt.position.z * this.lerpPos;

    // local rotation
    this.worldQuat.lerpQuaternions( this.level.path.quaternion, this.level.camLookAt.quaternion, this.lerpPos );
    this.localQuat.setFromEuler( this.localEuler );
    this.worldQuat.premultiply( this.localQuat );

    // local to world
    this.localToWorld.copy( this.localPos ).applyQuaternion( this.worldQuat ).add( this.worldPos );
    
    // align body
    this.body.position.copy( this.localToWorld );
    this.body.quaternion.copy( this.worldQuat );
    
    // align display
    this.display.position.copy( this.body.position );
    this.display.quaternion.copy( this.body.quaternion );
    this.minifigure.euler.y = this.localEuler.y;
    
    // update animation
    this.animMixer.fastUpdate( deltaTime );
    
    // debug
    if ( this.debug )
    {
        this.bodyDebug.position.copy( this.body.position );
        this.bodyDebug.quaternion.copy( this.body.quaternion );
    }
}
// </editor-fold>

Chen.prototype.engineHit = function( collider, contactPos ) // <editor-fold defaultstate="collapsed">
{
    // if already hit, return
    if ( this.state === this.STATES.HIT ) return;
    
    // get engine
    
    let idx = -1;
    
    if ( collider === this.engine_1_collider )
    {
        idx = 0;
    }
    else if ( collider === this.engine_2_collider )
    {
        idx = 1;
    }
    else if ( collider === this.engine_3_collider )
    {
        idx = 2;
    }
    else if ( collider === this.engine_4_collider )
    {
        idx = 3;
    }
    else
    {
        return;
    }

    if ( !this.body.shapes[ idx ].collisionResponse ) return;
    
    // overall power
    this.overallPower--;
    
    //decrease eninge power
    this.enginePower[ idx ] -= 1;
    let power = this.enginePower[ idx ];
    
    this.blinkingEngine = this.engines[ idx ];
    this.blinkCount = 2;
    this.enginePowerbars[ idx ].scale.x = power / 3;
    this.smokes[ idx ].mat.opacity = ( 3 - power ) / 3;
    this.enginePowerbars[ idx ].material.diffuse = this.enginePowerbarColors[ power ];
    
    // explosion
    contactPos.add( this.body.position );
    this.level.setExplosion( contactPos );
    
    // animation
    gsap.to( this, 0.5, { ease: Sine.easeOut, lerpPos: 0.5, sway: 0.5 } );
    gsap.to( this, 2, { ease: Sine.easeInOut, sway: 0.1, delay: 0.5 } );
    
    // if destroyed, deactivate engine
    if ( this.enginePower[ idx ] === 0 )
    {
        //this.engines[ idx ].visible = false;
        this.engines[ idx ].euler.x = 0.4;
        this.body.shapes[ idx ].collisionResponse = false;
        this.blinkingEngine = undefined;
        
        if ( this.debug ) this.bodyDebug.children[ idx ].visible = false;
    }
    
    // check death
    if ( this.overallPower < 1 )
    {
        this.level.setChenDefeated();
    }
    else
    {
        this.setState( this.STATES.HIT );
    }
}
// </editor-fold>

Chen.prototype.resetEngines = function() // <editor-fold defaultstate="collapsed">
{
    //decrease eninge power
    this.enginePower = [ 3, 3, 3, 3 ];
    this.overallPower = 12;
    this.blinkingEngine = undefined;
    
    for ( let i = 0; i < 4; i++ )
    {
        this.enginePowerbars[ i ].scale.x = 1;
        this.smokes[ i ].mat.opacity = 0;
        this.enginePowerbars[ i ].material.diffuse = this.enginePowerbarColors[ 3 ];
        this.engines[ i ].euler.copy( this.engineEulers[i] );
        this.body.shapes[ i ].collisionResponse = true;
    }
}
// </editor-fold>

Chen.prototype.destroy = function() // <editor-fold defaultstate="collapsed">
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