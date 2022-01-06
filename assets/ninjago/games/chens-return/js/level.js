'use strict';

function Level( app, id )  // <editor-fold defaultstate="collapsed">
{    
    this.app = app;
    this.levelId = id;
    this.tries = this.app.cookie.data.maps[ this.levelId ].tries;
    
    // states
    
    this.STATE = 
    {
        INIT:               0,
        READY:              1,
        INTRO:              2,
        RUNNING:            3,
        VEHICLE:            4,
        FINISH:             5,
        GAMEOVER:           6,
        TRANSFORM:          7,
        TRANSFORM_REVERSE:  8,
        COLLECT_SPECIAL:    9,
        PAUSED:             10,
        LEVEL_COMPLETE:     11,
        SCRIPTED_EVENT:     12,
        USE_EXTRALIFE:      13,
        VEHICLE_COLLISION:  14,
        CHEN_APPEARS:       15,
        DRAW_GOLDEN_WEAPON: 16,
        CHEN_FIGHTS:        17,
        CHEN_RETREATS:      18,
        LOST_ONE_PLAYER:    19,
        CHEN_DIES:          20,
        CHEN_DEAD:          21,
        GAME_COMPLETE:      22,
        OUTRO:              23,
        UNLOAD:             30
    }
    
    this.STATECOUNT = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
    
    this.state = this.STATE.INIT;
    this.lastState = this.STATE.INIT;
    this.debug = true;
    
    // constants    
    this.Deg2Rad = 1 / 180 * Math.PI;
    
    // map data
    this.mapStart = 0;
    this.mapPos = 0;
    this.defaultSpeed = 1;
    this.speed = 1;
    this.deltaTimeScale = 1;
    
    this.scriptedEventDuration = 0;
    this.scriptedEventTimeScale = 1;
    
    this.ecsDeltaTimeScale = 1;
    
    this.lastBlock = -1;
    this.currentBlock = 0;
    this.minBlock = 0;
    this.maxBlock = 0;
    
    // collision data
    this.forward = new zen3d.Vector3();
    this.up = new zen3d.Vector3( 0, 1, 0 );
    this.right = new zen3d.Vector3();
    this.contactWorldPos = new zen3d.Vector3();
    
    // camera data    
    this.FOV = 40 * this.Deg2Rad;
    this.cameraDefaultRot = new zen3d.Euler( -2.8, 0, -3.1415 );
    this.camY = 0;
    this.camHeight = 0;
    this.camCrouch = 0;
    this.camAddY = 0;
    
    // middle between path and camLookAt
    this.halfForward = new zen3d.Vector3();
    
    // possible lanes     
    this.currentLane = 0;
    this.lastLane = 0;
    this.laneMax = 1;
    this.vehicleLaneMax = 2;
    this.vehicleLaneMin = -2;
    this.laneChangeCooldown = 0;
    
    // possible heights (for boulder blaster)
    this.currentHeight = 0;
    this.lastHeight = 0;
    this.heightMin = 0;
    this.heightMax = 1;
    
    // player data
    this.extralife = 0;
    this.collisionTime = 0;
    
    // physics
    this.updatePhysicsFixed = false;
    this.physicsNeedUpdate = false;

    // load json data
    let jsonUrl = this.app.loader.extract( "level_" + this.levelId + "/_leveldata.json" );

    fetch( jsonUrl )
       .then( response => { return response.json(); } )
       .then( json => this.init( json ) );
}
// </editor-fold>

Level.prototype.init = function( jsonData )  // <editor-fold defaultstate="collapsed">
{
    this.jsonData = jsonData;
    this.debug = jsonData.debug;
    this.modelview = jsonData.debugModel;
    
    // audio
    this.app.audio.create( "level_music", this.app.loader.extract( jsonData.baseUrl + "audio/music.ogg" ) );
    this.app.audio.create( "atmo", this.app.loader.extract( jsonData.baseUrl + "audio/atmo.ogg" ) );
    this.app.audio.create( "danger", this.app.loader.extract( jsonData.baseUrl + "audio/danger.ogg" ) );
    this.app.audio.create( "fail", this.app.loader.extract( jsonData.baseUrl + "audio/fail.ogg" ) );
    this.app.audio.create( "success", this.app.loader.extract( jsonData.baseUrl + "audio/success.ogg" ) );
    
    if ( this.levelId === 3 )
    {
        this.app.audio.create( "music_fight", this.app.loader.extract( jsonData.baseUrl + 'audio/fight.ogg' ) );
    }
    
    // create input handler    
    this.input = new Input();
    
    // init zen3d custom props
    zen3d.textures = {};
    
    // create scene    
    this.app.scene = new zen3d.Scene();
    this.app.scene.disableShadowSampler = true;
    this.app.scene.fog = new zen3d.FogExp2( jsonData.fogColor, 0.02 );

    // path
    this.path = new zen3d.Object3D();
    this.path.name = "path";
    //this.path.matrixAutoUpdate = false;
    this.app.scene.add( this.path );
    
    // cam follow
    this.pathFollow = new zen3d.Object3D();
    this.path.name = "pathFollow";
    this.app.scene.add( this.pathFollow ); 
    
    // cam lookAt
    this.camLookAt = new zen3d.Object3D();
    this.app.scene.add( this.camLookAt );

    // camera
    this.app.camera = new Camera( this );
    this.pathFollow.add( this.app.camera );
    this.app.camera.setFrustum( 0.1, 4000 );
    this.app.camera.updatePerspective();
    
    // vehicle rotation helpers
    this.vehiclePosHelper = new zen3d.Vector3();
    this.vehicleQuatHelper = new zen3d.Object3D();
    this.app.scene.add( this.vehicleQuatHelper );
    
    // skybox    
    this.envMap = zen3d.TextureCube.fromSrc
    ([    
        this.app.loader.extract( jsonData.baseUrl + jsonData.skyboxUrl + '_0000.jpg' ),
        this.app.loader.extract( jsonData.baseUrl + jsonData.skyboxUrl + '_0001.jpg' ),
        this.app.loader.extract( jsonData.baseUrl + jsonData.skyboxUrl + '_0002.jpg' ),
        this.app.loader.extract( jsonData.baseUrl + jsonData.skyboxUrl + '_0003.jpg' ),
        this.app.loader.extract( jsonData.baseUrl + jsonData.skyboxUrl + '_0004.jpg' ),
        this.app.loader.extract( jsonData.baseUrl + jsonData.skyboxUrl + '_0005.jpg' )
    ]);
    
    // create ambient    
    this.app.ambient = new zen3d.AmbientLight( jsonData.ambientColor );
    this.app.scene.add( this.app.ambient );
    // 0x080400
    
    // dir light
    this.mainDirLightPos = new zen3d.Vector3( jsonData.mainLightPos.x, jsonData.mainLightPos.y, jsonData.mainLightPos.z );
    this.dirLightLookAt = new zen3d.Vector3();
    
    this.app.dir_light = new zen3d.DirectionalLight( jsonData.mainLightColor );
    this.app.dir_light.intensity = jsonData.mainLightIntensity;
    this.app.dir_light.position.copy( this.mainDirLightPos );
    this.app.dir_light.lookAt( new zen3d.Vector3( 0, 0, 50 ), this.up );
    
    this.app.dir_light.worldDirection = this.app.dir_light.position.clone();
    this.app.dir_light.worldDirection.y = 0;
    this.app.dir_light.worldDirection.normalize();

    this.app.dir_light.castShadow = true;
    this.app.dir_light.shadowPassEnabled = true;
    this.app.dir_light.shadow.mapSize.x = 2048; // 1024
    this.app.dir_light.shadow.mapSize.y = 2048; // 1024
    this.app.dir_light.shadow.windowSize = this.jsonData.mainLightShadowWindow;
    this.app.dir_light.shadow.cameraNear = this.jsonData.mainLightShadowNear;
    this.app.dir_light.shadow.cameraFar = this.jsonData.mainLightShadowFar;
    
    // set shadow bias depending on webgl & ios
    if ( this.app.renderer.glCore.capabilities.version < 2 && App.isIOS )
    {
        this.app.dir_light.shadow.bias = -0.0006;
    }
    else
    {
        this.app.dir_light.shadow.bias = -0.0002;
    }

    this.app.dir_light.shadowType = zen3d.SHADOW_TYPE.HARD;
    
    this.app.scene.add( this.app.dir_light );
    
    // dir light 2
    
    this.app.dir_light_2 = new zen3d.DirectionalLight();
    this.app.dir_light_2.intensity = 1;
    this.app.dir_light_2.position.copy( this.mainDirLightPos ).multiplyScalar( 0.1 );
    this.app.dir_light_2.lookAt( new zen3d.Vector3( 0, 0, 0 ), this.up );
    
    if ( jsonData.mainLightShadowOpacity > 0 )
    {
        this.app.dir_light_2.castShadow = true;
        this.app.dir_light_2.shadowPassEnabled = true;
        this.app.dir_light_2.shadow.mapSize.x = 256;
        this.app.dir_light_2.shadow.mapSize.y = 256;
        this.app.dir_light_2.shadow.windowSize = 2;
    }
    
    this.app.scene.add( this.app.dir_light_2 );
    
    // setup physics world    
    this.app.physics = new Physics();
    
    // hud    
    this.hud = new HUD( this );
    
    // create leveldata    
    this.levelparser = new LevelParser( this );
    this.levelparser.init( jsonData );
}
// </editor-fold>

Level.prototype.onParsingComplete = function()  // <editor-fold defaultstate="collapsed">
{
    let blockLength = 0;
    
    for ( var i = 0; i < this.levelparser.randomBlockOrder.length; i++ )
    {
        if ( this.levelparser.json.startBlock === i )
        {
            this.mapStart = blockLength * 3.333333;
            this.mapStart += this.levelparser.json.startPos;
        }
        
        blockLength += this.levelparser.randomBlockOrder[i].length;
    }
    
    // debug camera
    if ( this.jsonData.debugCamera )
    {
        this.debugCamera = new zen3d.Camera();
        this.debugCamera.setPerspective( this.FOV, this.app.aspectRatio, 0.1, 8000 );
        this.debugCamera.position.set( 0, 1, 0 );
        this.app.scene.add( this.debugCamera );
        this.orbitControls = new zen3d.OrbitControls( this.debugCamera, this.app.canvas );  
        
        if ( this.modelview )
        {
            if ( this.modelview === "player" )
            {
                this.path.add( this.debugCamera );
            }
            else
            {            
                let item = AppUtils.getAllObjects( this.app.scene.children, this.modelview, "", true )[0];

                if ( item )
                {
                    let worldPos = new zen3d.Vector3().setPositionFromMatrix( item.worldMatrix );
                    this.debugCamera.position.set( worldPos.x, worldPos.y + 2, worldPos.z - 1 );
                    this.orbitControls.target = worldPos;
                }
                else
                {
                    console.log( "debugModel error:", this.modelview, "not found!" );
                }
            }
        }
        
        //this.hud.root.visible = false;
        //this.hud.bg.style.visibility = "hidden";
    }
    
    if ( this.jsonData.debugLighting ) this.lightingDebugger = new LightingDebugger( this );
    
    // debug
    if ( this.jsonData.showDebugPanel )
    {
        this.debugStartPanel = AppUtils.createElement( "div", "debugStartPanel" );
        this.debugStartPanel.style.left = ( this.app.stageW * 0.5 ) + "px";

        let i = 0;
        let button;

        for ( i; i < this.levelparser.randomBlockOrder.length; i++ )
        {
            button = AppUtils.createElement( "div", "debugStartButton" );
            button.style.left = ( i * 40 ) + "px";
            button.num = i;
            button.textContent = i;
            button.addEventListener( "click", this.onDebugStartButtonClick.bind( this ) );
            this.debugStartPanel.append( button );
        }
        
        this.app.stage.append( this.debugStartPanel );
    }
    
    // map-specific specials, TODO: move to level parser & ecs
    
    if ( this.levelId === 0 )
    {
        this.stoneCollision = this.levelparser.specials[ "StoneCollision" ];
        this.app.scene.add( this.stoneCollision.display );

        this.cactusCollision = this.levelparser.specials[ "CactusCollision" ];
        this.app.scene.add( this.cactusCollision.display );
    }
    else if ( this.levelId === 2 )
    {
        this.iceCollision = this.levelparser.specials[ "IceCollision" ];
        this.app.scene.add( this.iceCollision.display );
    }
    else if ( this.levelId === 3 )
    {
        this.boxCollision = this.levelparser.specials[ "BoxesCollision" ];
        this.app.scene.add( this.boxCollision.display );
    }
    
    // map-specific

    if ( this.levelId < 3 )
    {
        // create minifigure    
        this.player = new Player( this, this.onPlayerReady.bind( this ) );
    }
    else if ( this.levelId === 3 )
    {
        // create chen first
        this.chen = new Chen( this, this.onMultiplePlayersReady.bind( this ) );
    }
}
// </editor-fold>

Level.prototype.onMultiplePlayersReady = function()  // <editor-fold defaultstate="collapsed">
{
    if ( !this.players )
    {
        // add to scene
        this.app.scene.add( this.chen.display );
        
        // create players
        this.players = [];
    }
    
    // create kai
    if ( this.players.length === 0 )
    {
        this.players.push( new Player( this, this.onMultiplePlayersReady.bind( this ), "kai" ) );
    }
    // create cole
    else if ( this.players.length === 1 )
    {
        this.players.push( new Player( this, this.onMultiplePlayersReady.bind( this ), "cole" ) );
    }
    // create zane
    else if ( this.players.length === 2 )
    {
        this.players.push( new Player( this, this.onMultiplePlayersReady.bind( this ), "zane" ) );
    }
    // done
    else
    {
        this.players[1].display.visible = false;
        this.players[2].display.visible = false;

        this.app.scene.add( this.players[1].display );
        this.app.scene.add( this.players[2].display );
        
        this.players[1].body.addEventListener( "collide", this.onPlayerCollision.bind( this ) );
        this.players[2].body.addEventListener( "collide", this.onPlayerCollision.bind( this ) );
        
        this.player = this.players[0];
        
        this.onPlayerReady();
    }    
}
// </editor-fold>

Level.prototype.onPlayerReady = function()  // <editor-fold defaultstate="collapsed">
{  
    this.playerId = 0;
    
    // add hero to scene
    this.player.body.addEventListener( "collide", this.onPlayerCollision.bind( this ) );
    this.app.scene.add( this.player.display );
    
    // create sparks
    
    this.sparks = new ParticleSystem
    ({
        num:            10,
        origin:         new zen3d.Vector3( 0, 0, 0 ),
        gravity:        new zen3d.Vector3( 0, 0, 0 ),
        emitterSize:    new zen3d.Vector3( 0.0, 0.0, 0.0 ),

        velocityRange:      { min: new zen3d.Vector3( -2, -1, -2 ), max: new zen3d.Vector3( 2, 4, -2 ) },
        scaleRange:         { min: 0.7, max: 0.9 },
        lifetimeRange:      { min: 0.5, max: 0.7 },
        timeOffsetRange:    { min: 0.05, max: 0.1 },
        alphaRange:         { min: 1, max: 1 },
        
        fadein:             0.01,
        fadeout:            0.1,
        scaleOverTime:      1,
        rotateOverTime:     0,
        loop:               1,
        
        img: this.app.baseUrl + "/fx/sparks.png",
        blending: zen3d.BLEND_TYPE.ADD
    });
    this.sparks.mat.depthTest = false;
    this.app.scene.add( this.sparks.display );
    
    // create stars
    
    this.stars = new ParticleSystem
    ({
        num:            10,
        origin:         new zen3d.Vector3( 0, 0.3, 0 ),
        gravity:        new zen3d.Vector3( 0, 0, -5 ),
        emitterSize:    new zen3d.Vector3( 0.1, 0.1, 0.05 ),

        velocityRange:      { min: new zen3d.Vector3( -0.4, -0.4, -0.4 ), max: new zen3d.Vector3( 0.4, 0.4, 0.4 ) },
        scaleRange:         { min: 0.1, max: 0.2 },
        lifetimeRange:      { min: 0.2, max: 0.3 },
        timeOffsetRange:    { min: 0.05, max: 0.1 },
        alphaRange:         { min: 1, max: 1 },
        fadein:             0.01,
        fadeout:            0.02,
        scaleOverTime:      -1,
        rotateOverTime:     0,
        loop:               1,
        
        img: this.app.baseUrl + "/fx/sparkle.png",
        blending: zen3d.BLEND_TYPE.ADD
    });
    this.stars.mat.depthTest = false;
    this.stars.mat.depthWrite = false;
    this.player.display.add( this.stars.display );
   
    // create magnet    
    this.magnet = new ECS.Magnet();
    
    // create slowmo
    this.slowmo = new ECS.Slowmo();

    // create dust
    
    this.dust = new ParticleSystem
    ({
        num:            20,
        origin:         new zen3d.Vector3( 0, 0, 0 ),
        gravity:        new zen3d.Vector3( 0, 0, 0 ),
        emitterSize:    new zen3d.Vector3( 0.1, 0.1, 0.1 ),

        velocityRange:      { min: new zen3d.Vector3( -0.1, 0.2, -1.5 ), max: new zen3d.Vector3( 0.1, 0.5, -2 ) },
        scaleRange:         { min: 0.1, max: 0.2 },
        lifetimeRange:      { min: 0.3, max: 0.5 },
        timeOffsetRange:    { min: 0.05, max: 0.1 },
        alphaRange:         { min: 0.8, max: 1 },
        fadein:             0.02,
        fadeout:            0.2,
        scaleOverTime:      1,
        rotateOverTime:     0,
        loop:               0,
        
        img: this.app.baseUrl + "/fx/dust.png",
        blending: zen3d.BLEND_TYPE.NORMAL
    });
    //this.dust.display.scale.set( 0.5, 0.5, 0.5 );
    this.app.scene.add( this.dust.display );
    
    // create explosion
    
    this.explosions = [];
    this.currentExplosion = 0;
    let exp;
    
    for ( let i = 0; i < 20; i++ )
    {
        exp = new ParticleSystem
        ({
            num:            20,
            origin:         new zen3d.Vector3( 0, 0, 0 ),
            gravity:        new zen3d.Vector3( 0, -2, 0 ),
            emitterSize:    new zen3d.Vector3( 0.1, 0.1, 0.2 ),

            velocityRange:      { min: new zen3d.Vector3( -0.4, 0.6, -0.4 ), max: new zen3d.Vector3( 0.4, 1.2, 0.4 ) },
            scaleRange:         { min: 0.2, max: 0.4 },
            lifetimeRange:      { min: 0.4, max: 0.8 },
            timeOffsetRange:    { min: 0.02, max: 0.04 },
            alphaRange:         { min: 0.4, max: 0.8 },
            fadein:             0.001,
            fadeout:            0.2,
            scaleOverTime:      2,
            rotateOverTime:     0,
            loop:               1,

            img: this.app.baseUrl + "/fx/dust.png",
            blending: zen3d.BLEND_TYPE.ADD        
        });
        exp.display.position.y = 100;
        this.app.scene.add( exp.display );
        this.explosions.push( exp );
    }
    
    // create snowstorm
    
    if ( this.levelId === 2 )
    {
        this.snowstorm = new AdvancedParticleSystem
        ({
            count: 1000,
            repeat: 1000000,
            gravity: new zen3d.Vector3( 0, 0, 0 ),
            texUrl: this.levelparser.json.baseUrl + "fx/snowflake.png",

            uvTransform:
            {
                offset: { x: 0, y: 0 },
                scale: { x: 1, y: 1 }
            },

            emitter:
            {
                size: new zen3d.Vector3( 2, 2, 10 )
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
                min: new zen3d.Vector3( -1, -2, -1 ),
                max: new zen3d.Vector3( -2, -2.5, -2 )
            },

            alpha:
            {
                min: 0.5,
                max: 1
            },

            scale:
            {
                birth:
                {
                    min: 0.1,
                    max: 0.15
                },
                death:
                {
                    min: 0.1,
                    max: 0.15
                }
            },
            colorOverLife:
            [
                { time: 0.0, color: new zen3d.Color3( "0xFFFFFF" ) },
                { time: 0.25, color: new zen3d.Color3( "0xFFFFFF" ) },
                { time: 0.5, color: new zen3d.Color3( "0xFFFFFF" ) },
                { time: 0.75, color: new zen3d.Color3( "0xFFFFFF" ) }
            ],
            alphaOverLife:
            [
                { time: 0, alpha: 0 },
                { time: 0.1, alpha: 1 },
                { time: 0.9, alpha: 1 },
                { time: 1, alpha: 0 }
            ],
            rotation:
            {
                min: 1,
                max: 2
            },
            wiggle:
            {
                amplitude: new zen3d.Vector3( 1, 0.2, 1 ),
                frequency:
                {
                    min: 1,
                    max: 2
                }
            }
        });
        this.snowstorm.display.position.set( 0, 2.5, 5 );
        this.pathFollow.add( this.snowstorm.display );
    }
    
    // create camera animation
    
    ECS.setAnimationTarget( this.levelparser.cameraAnimationData, this.app.camera );
    this.cameraAnimation = new zen3d.AnimationMixer();
    this.cameraAnimation.add( this.levelparser.cameraAnimationData );
    
    // create path and camLookAt animation
    
    ECS.setAnimationTarget( this.levelparser.path, this.path );
    this.pathAnim = new zen3d.AnimationMixer();
    this.pathAnim.add( this.levelparser.path );
    
    ECS.setAnimationTarget( this.levelparser.camLookAt, this.camLookAt );
    this.camLookAtAnim = new zen3d.AnimationMixer();
    this.camLookAtAnim.add( this.levelparser.camLookAt );
    
    // debug
   
    if ( this.debug )
    {
        this.debugMaterial_Green = new zen3d.BasicMaterial();
        this.debugMaterial_Green.diffuse = new zen3d.Color3( 0x00FF00 );
    }
   
    // create savepoint
    SavepointManager.createSavepoint();
    
    // render
    this.render();
    
    // audio
    this.app.audio.play( "atmo", true );
    
    // init positions, variables, player
    this.app.levelCreationComplete();
};
// </editor-fold>

Level.prototype.prepareStart = function() // <editor-fold defaultstate="collapsed">
{    
    this.tries++;
    this.app.updateLocalStorage( this.tries );
    
    // reset playerId
    if ( this.levelId === 3 )
    {
        this.playerId = 0;
        this.player = this.players[0];
        
        this.player.setGoldFactor( 0 );
        this.player.goldenWeapon.visible = false;
        this.player.goldenWeapon_Backpack.visible = true;
        
        this.players[1].display.position.set( 0.25, 0, -0.25 );
        this.players[1].goldenWeapon.visible = false;
        this.players[1].goldenWeapon_Backpack.visible = true;
        this.players[1].setGoldFactor( 0 );
        this.players[1].display.visible = true;
        this.players[1].play( "IDLE" );
        this.players[1].animMixer.fastUpdate( 0 );
        
        this.players[2].display.position.set( -0.25, 0, -0.25 );
        this.players[2].goldenWeapon.visible = false;
        this.players[2].goldenWeapon_Backpack.visible = true;
        this.players[2].setGoldFactor( 0 );
        this.players[2].display.visible = true;
        this.players[2].play( "IDLE" );
        this.players[2].animMixer.fastUpdate( 0 );
        
        this.chen.display.position.y = -10;
        this.chen.resetEngines();
    };
    
    // state
    this.state = this.STATE.READY;
    this.STATECOUNT[ this.STATE.READY ] = 0;
    
    // camera intro animation
    this.cameraAnimation.play( "CAM_Anim", 0 );
    this.cameraAnimation.update( 0 );
    
    // map data
    this.speed = this.defaultSpeed;
    this.deltaTimeScale = 1;
    this.ecsDeltaTimeScale = 1;
    this.slowmo.timeScale = 1;
    this.mapPos = this.mapStart;
    this.currentLane = this.lastLane = 0;
    
    this.lastBlock = -1;
    this.currentBlock = 0;
    
    // path
    this.pathAnim.play( "PATH", this.mapPos );
    this.pathAnim.update( 0 );
    this.path.updateMatrix();
    
    // camLookAt
    this.camLookAtAnim.play( "CAM_LOOKAT", this.mapPos + 0.8 );
    this.camLookAtAnim.update( 0 );
    this.camLookAt.updateMatrix();
    
    // pathFollow
    this.pathFollow.position.copy( this.path.position );
    this.pathFollow.lookAt( this.camLookAt.position, this.up );
    
    // skybox
    this.skybox.position.copy( this.path.position );
    
    // player
    this.player.setState( this.player.STATES.IDLE );
    
    this.player.localPos.set( 0, 0, 0 );
    this.player.worldPos.copy( this.path.position );
    this.player.worldQuat.copy( this.path.quaternion );
    
    this.player.body.position.copy( this.player.worldPos );
    this.player.body.quaternion.copy( this.player.worldQuat );
    this.player.body.velocity.set( 0, 0, 0 );
    
    this.player.display.position.copy( this.player.worldPos );
    this.player.display.quaternion.copy( this.player.worldQuat );

    this.player.display.updateMatrix();
    
    // camera
    this.camHeight = this.player.body.position.y + this.path.position.y;
    this.camCrouch = 0;
    this.camAddY = 0;
    this.app.camera.container.position.set( 0, 0, 0 );
    
    // lighting
    this.setLighting( this.levelparser.json.mainLightIntensity, 1, 1, new zen3d.Color3( this.levelparser.json.ambientColor ) );
    
    // block visibility
    this.computeBlockVisibility();
    
    // specials
    this.magnet.timer = 0;
    this.slowmo.timer = 0;
    
    // fx
    this.stars.display.position.z = 100;
    this.dust.setOpacity( 0 );
    
    if ( this.levelId === 2 )
    {
        this.snowstorm.setStartTime( 1 );
        this.snowstorm.onUpdate( 0 );
    }

    // hud
    this.hud.reset();
    
    // music
    this.app.audio.stop( "fail" );
    this.app.audio.play( "level_music", true );
    
    // reset time
    FT.resetTiming = true;
};
// </editor-fold>

Level.prototype.prepareNextPlayer = function() // <editor-fold defaultstate="collapsed">
{
    // state
    this.state = this.STATE.READY;
    this.STATECOUNT[ this.STATE.READY ] = 0;
    
    // dirty fix for dead bodies
    this.players[ this.playerId - 1 ].display.visible = false;
    
    // setup next player
    this.player = this.players[this.playerId];
    this.player.display.visible = true;
    
    // camera intro animation
    this.cameraAnimation.play( "CAM_Anim", 0 );
    this.cameraAnimation.update( 0 );
    
    // map data
    this.speed = this.defaultSpeed;
    this.deltaTimeScale = 1;
    this.ecsDeltaTimeScale = 1;
    this.slowmo.timeScale = 1;
    this.currentLane = this.lastLane = 0;
    this.mapPos -= 0.2;
    
    // path
    this.pathAnim.play( "PATH", this.mapPos );
    this.pathAnim.update( 0 );
    this.path.updateMatrix();
    
    // camLookAt
    this.camLookAtAnim.play( "CAM_LOOKAT", this.mapPos + 0.8 );
    this.camLookAtAnim.update( 0 );
    this.camLookAt.updateMatrix();
    
    // pathFollow
    this.pathFollow.position.copy( this.path.position );
    this.pathFollow.lookAt( this.camLookAt.position, this.up );
    
    // skybox
    this.skybox.position.copy( this.path.position );
    
    // player
    this.player.setState( this.player.STATES.IDLE );
    
    this.player.localPos.set( 0, 0, 0 );
    this.player.worldPos.copy( this.path.position );
    this.player.worldQuat.copy( this.path.quaternion );
    
    this.player.body.position.copy( this.player.worldPos );
    this.player.body.quaternion.copy( this.player.worldQuat );
    this.player.body.velocity.set( 0, 0, 0 );
    
    this.player.display.position.copy( this.player.worldPos );
    this.player.display.quaternion.copy( this.player.worldQuat );

    this.player.display.updateMatrix();
    
    // chen
    this.chen.shot.display.visible = false;
    this.chen.display.position.y = -10;
    this.chen.resetEngines();
    
    // camera
    this.camHeight = this.player.body.position.y + this.path.position.y;
    this.camCrouch = 0;
    this.camAddY = 0;
    this.app.camera.container.position.set( 0, 0, 0 );
    
    // specials
    this.magnet.timer = 0;
    this.slowmo.timer = 0;
    
    // golden players
    this.player.setGoldFactor( 0 );
    this.player.goldenWeapon.visible = false;
    this.player.goldenWeapon_Backpack.visible = true;
    
    // fx
    this.stars.display.position.z = 100;
    this.dust.setOpacity( 0 );

    // hud
    this.hud.reset();
    
    // music
    this.app.audio.stop( "fail" );
    this.app.audio.play( "level_music", true );
    
    // reset time
    FT.resetTiming = true;
};
// </editor-fold>

Level.prototype.onPlayerCollision = function( event ) // <editor-fold defaultstate="collapsed">
{
    // if body is inactive, do nothing
    if ( !this.player.minifigure_body.collisionResponse ) return;
    
    // if dead, do nothing
    if ( this.player.state === this.player.STATES.DIE ) return;
    
    // if level 3 complete, do nothing
    if ( this.state === this.STATE.CHEN_DIES ) return;
    
    // get other
    let entity;
    
    if ( event.target === event.contact.bi )
    {
        entity = event.contact.bj.entity;
    }
    else
    {
        entity = event.contact.bi.entity;
    }
    
    // if other is disabled, do nothing
    if ( !entity.enabled ) return;
    
    // ground
    if ( entity.type === ECS.TYPE.STATIC )
    {
        if ( this.player.state === this.player.STATES.JUMP )
        {
            this.player.setState( this.player.STATES.RUNNING );
            this.input.unlock();
        }
    }

    // obstacle
    else if (   entity.type === ECS.TYPE.OBSTACLE || 
                entity.type === ECS.TYPE.STONE || 
                entity.type === ECS.TYPE.CACTUS || 
                entity.type === ECS.TYPE.ENEMY_SHOT || 
                entity.type === ECS.TYPE.ICE_TOOTH ||
                entity.type === ECS.TYPE.BOXES )
    {
        /*
        // compute collision direction
        let z = Math.abs( event.contact.ni.x ) + Math.abs( event.contact.ni.z );
        
        // ground collision after fall
        if ( event.contact.ni.y < -0.8 )
        {
            this.player.setState( this.player.STATES.RUNNING );
            this.input.unlock();
            this.player.body.velocity.y = 0;
        }

        // frontal obstacle collision
        else if ( z > 0.9 )
        {
            // if blinking, do nothing
            if ( this.player.blinkCount <= 0 )
            {
                // fatal collision
                this.fatalCollision( entity, -1 );
            }
        };
        */
       
        // get world direction
        let mat = this.path.worldMatrix.elements;
        this.forward.set( mat[8], mat[9], mat[10] ).normalize();
        this.right.crossVectors( this.forward, this.up );
        this.contactWorldPos.x = this.right.x * event.contact.ni.x + this.right.y * event.contact.ni.y + this.right.z * event.contact.ni.z;
        this.contactWorldPos.y = event.contact.ni.y;
        this.contactWorldPos.z = this.forward.x * event.contact.ni.x + this.forward.y * event.contact.ni.y + this.forward.z * event.contact.ni.z;

        //console.log( " x ", this.contactWorldPos.x.toFixed(2), " y ", this.contactWorldPos.y.toFixed(2), " z ", this.contactWorldPos.z.toFixed(2), " abs(x) ", ( Math.abs( this.contactWorldPos.x ) ).toFixed(2) );

        // ground collision after fall
        if ( this.contactWorldPos.y < -0.8 )
        {
            this.player.setState( this.player.STATES.RUNNING );
            this.input.unlock();
            this.player.body.velocity.y = 0;
        }

        // frontal obstacle collision
        else if ( this.contactWorldPos.z > Math.abs( this.contactWorldPos.x ) )
        {
            if ( this.player.blinkCount <= 0 )
            {
                if ( this.levelId < 3 )
                {
                    this.fatalCollision( entity, -1 );
                }
                else
                {
                    if ( entity.type === ECS.TYPE.BOXES )
                    {
                        if ( this.player.state < this.player.STATES.GOLDEN_WEAPON )
                        {
                            this.fatalGoldenCollision( -1 );
                        }
                        else
                        {
                            this.boxCollision.start( entity.body.position, this.path.quaternion );
                            entity.display.visible = false;
                            entity.body.collisionResponse = false;
                            entity.enabled = false;
                        }
                    }
                    else
                    {
                        this.fatalGoldenCollision( -1 );
                    }
                }
            }
        }
        
        // reset lane
        else
        {
            if ( this.laneChangeCooldown === 0 )
            {
                if ( this.contactWorldPos.x < -0.1 )
                {
                    this.currentLane = Math.min( this.laneMax, this.currentLane + 1 );
                    this.laneChangeCooldown = 3;
                }
                else if ( this.contactWorldPos.x > 0.1 )
                {
                    this.currentLane = Math.max( -this.laneMax, this.currentLane - 1 );
                    this.laneChangeCooldown = 3;
                }
            }
            
            this.laneChangeCooldown = Math.max( this.laneChangeCooldown - 1, 0 );
        }
    }

    else if ( entity.type === ECS.TYPE.STANDARD_BRICK )
    {
        this.collectStandardBrick();
    }

    else if ( entity.type === ECS.TYPE.MAGNET_BRICK )
    {
        this.magnet.start();
    }
    
    else if ( entity.type === ECS.TYPE.GOLDEN_BRICK )
    {
        this.collectGoldenBrick();
    }

    else if ( entity.type === ECS.TYPE.VEHICLE_BRICK )
    {
        this.startVehicle();
    }

    else if ( entity.type === ECS.TYPE.DEATH_ZONE )
    {
        this.fatalCollision( entity, -0.5 );
    }
    
    else if ( entity.type === ECS.TYPE.CHEN )
    {
        this.fatalGoldenCollision( -0.5 );
    }
    
    else if ( entity.type === ECS.TYPE.STAFF_SHOT )
    {
        this.fatalGoldenCollision( -0.5 );
    }

    // inform entity
    if ( entity.onCollision ) entity.onCollision();
    
    // debug
    if ( this.debug )
    {
        if (  event.contact.sj.debugMesh )
        {
            for ( var i = 0 ; i < entity.body.debugMesh.children.length; i++ )
            {
                entity.body.debugMesh.children[i].material = this.debugMaterial_Green;
            }
        }
    }
};

// </editor-fold>

Level.prototype.onVehicleCollision = function( event ) // <editor-fold defaultstate="collapsed">
{
    if ( !this.player.vehicle_body.collisionResponse ) return;
    
    // get other
    let other;
    let shape;
    let contactPos = new zen3d.Vector3();
    
    if ( event.target === event.contact.bi )
    {
        other = event.contact.bj;
        shape = event.contact.si;
        contactPos.copy( event.contact.ri );
    }
    else
    {
        other = event.contact.bi;
        shape = event.contact.sj;
        contactPos.copy( event.contact.rj );
    }
    
    // collision handling

    if ( other.entity.enabled )
    {        
        // game-relevant collision
        if ( other.entity.type === ECS.TYPE.OBSTACLE || other.entity.type === ECS.TYPE.STONE || other.entity.type === ECS.TYPE.CACTUS || other.entity.type === ECS.TYPE.ENEMY_SHOT )
        {
            let z = Math.abs( event.contact.ni.x ) + Math.abs( event.contact.ni.z );
            
            if ( !other.entity.subtype )
            {
                // frontal obstacle collision
                if ( z > 0.9 )
                {
                    contactPos.add( this.player.body.position );
                    this.fatalVehicleCollision( other, contactPos );
                }
            }
            else
            {
                if ( other.entity.subtype === "ICE_TOOTH" )
                {
                    this.iceCollision.start( other.position, this.path.quaternion, other.entity.display.scale );
                    other.entity.display.visible = false;
                    other.collisionResponse = false;
                    other.entity.enabled = false;
                }
                else if ( other.entity.subtype === "DESTRUCTABLE" )
                {
                    if ( this.player.invincible )
                    {
                        this.iceCollision.start( other.position, this.path.quaternion, other.entity.display.scale );
                        other.entity.display.visible = false;
                        other.collisionResponse = false;
                        other.entity.enabled = false;
                    }
                    else
                    {
                        contactPos.add( this.player.body.position );
                        this.fatalVehicleCollision( other, contactPos );
                    }
                }
            }
        }
        else if ( other.entity.type === ECS.TYPE.STANDARD_BRICK )
        {
            this.collectStandardBrick();
        }
        else if ( other.entity.type === ECS.TYPE.GOLDEN_BRICK )
        {
            this.collectGoldenBrick();
        }

        if ( other.entity.onCollision ) other.entity.onCollision();
    }
    
    // in any case: kill vehicle velocity
    this.player.body.velocity.x = 0;
    this.player.body.velocity.z = 0;
}
// </editor-fold>

Level.prototype.onShotCollision = function( event ) // <editor-fold defaultstate="collapsed">
{
    // get other
    let other;
    event.target === event.contact.bi ? other = event.contact.bj : other = event.contact.bi;
    
    // get type of collision
    
    if ( other.collisionResponse )
    {       
        if ( other.entity.type === ECS.TYPE.STONE )
        {
            this.stoneCollision.start( other.position, this.path.quaternion );
            other.entity.display.visible = false;
            other.collisionResponse = false;
            other.entity.enabled = false;
        }
        else if( other.entity.type === ECS.TYPE.CACTUS )
        {
            this.cactusCollision.start( other.position, this.path.quaternion );
            other.entity.display.visible = false;
            other.collisionResponse = false;
            other.entity.enabled = false;
        }
        
        // explosion
        this.explosions[this.currentExplosion].setStartTime();
        this.explosions[this.currentExplosion].display.position.copy( event.target.position );

        this.currentExplosion++;
        if ( this.currentExplosion > this.explosions.length - 1 ) this.currentExplosion = 0;

        // deactivate
        event.target.entity.disable();
    }
}
// </editor-fold>

Level.prototype.onGoldenWeaponCollision = function( event ) // <editor-fold defaultstate="collapsed">
{
    // get other
    let other;
    let othershape;
    let contactPos = new zen3d.Vector3();
    
    if ( event.target === event.contact.bi )
    {
        other = event.contact.bj;
        othershape = event.contact.sj;
        contactPos.copy( event.contact.rj );
    }
    else
    {
        other = event.contact.bi;
        othershape = event.contact.si;
        contactPos.copy( event.contact.ri );
    }
    
    // discard collision with all but chen
    if( other.type === CANNON.Body.STATIC ) return;

    // collision handling
    this.chen.engineHit( othershape, contactPos );
}
// </editor-fold>

Level.prototype.onUpdate = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    if ( this.state === this.STATE.INIT ) return;

    if ( this.debug )
    {
        //let str = Object.keys( this.STATE ).find( key => this.STATE[key] === this.state ).toString();
        let str = Object.keys( this.player.STATES ).find( key => this.player.STATES[key] === this.player.state ).toString();
        this.app.debugBox.innerHTML = str;
    }

    // cache last state
    if ( this.lastState !== this.state )
    {
        this.STATECOUNT[ this.state ] = 0;
        this.lastState = this.state;
    }
    
    // increase statecount
    this.STATECOUNT[ this.state ] += deltaTime;
    
    // apply deltaTimeScale & slowmo timeScale
    deltaTime *= this.deltaTimeScale * this.slowmo.timeScale;
    
    // special for titan mech
    if ( this.player.invincible ) deltaTime *= 1.5;
    
    // debug
    if ( this.debugCamera ) deltaTime *= this.jsonData.debugSpeed;

    // ****************************************************************************************************************************
    // READY **********************************************************************************************************************
    // ****************************************************************************************************************************
    
    if ( this.state === this.STATE.READY )
    {
        this.cameraAnimation.fastUpdate( 0 );
        this.player.onUpdate( 0 );
        
        if ( this.STATECOUNT[ this.STATE.READY ] > 0.5 )
        {
            this.state = this.STATE.INTRO;
            this.hud.fadein();
            
            if ( this.levelId === 3 )
            {
                this.hud.showGoldenNinjas( this.playerId );
            }
        }
        
        // PHYSICS -----------------------------------------------------------------------------------------------------  
        this.physicsNeedUpdate = false;
    }
    
    // ****************************************************************************************************************************
    // INTRO **********************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.INTRO )
    {
        // CULLING --------------------------------------------------------------------------------------------------
        this.computeBlockVisibility();
        
        // CAMERA -----------------------------------------------------------------------------------------------------        
        this.cameraAnimation.fastUpdate( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------  
        this.physicsNeedUpdate = false;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );

        // check for state end
        if ( this.STATECOUNT[ this.STATE.INTRO ] > 4 )
        {
            this.state = this.STATE.RUNNING;
            this.player.setState( this.player.STATES.RUNNING );
            this.input.unlock();
            
            // hud
            this.hud.showIngame();

            // apply camera
            //this.app.camera.setBlock( this.levelparser.blocks[ this.currentBlock ].block.camera, false );
            this.app.camera.setBlock( this.levelparser.blocks[ this.currentBlock ].block.camera, true );
            
            // fx
            this.dust.setOpacity( 1 );
        }
        
        // golden player
        if ( this.levelId === 3 )
        {
            //this.player.setGoldFactor( this.STATECOUNT[ this.STATE.INTRO ] * 0.25 );
        }
        
        // fx
        this.updateFX( deltaTime );
    }
    
    // ****************************************************************************************************************************
    // RUNNING ********************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.RUNNING )
    {
        // CULLING --------------------------------------------------------------------------------------------------
        this.computeBlockVisibility();
        
        // MAP POSITION --------------------------------------------------------------------------------------------------
        this.mapPos += deltaTime * this.speed;
        
        // PATH & CAMERA -----------------------------------------------------------------------------------------------------
        this.updatePathAndCamera( deltaTime );
   
        // INPUT -----------------------------------------------------------------------------------------------------
        this.checkInput( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------
        // prevent shooting up
        if ( 
                this.player.state !== this.player.STATES.JUMP &&
                this.player.state !== this.player.STATES.STRAFE_L &&
                this.player.state !== this.player.STATES.STRAFE_R
           )
        {
            if ( this.player.body.velocity.y > 0 ) this.player.body.velocity.y = 0;
        }
    
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );
        
        // fx
        this.updateFX( deltaTime );
    }
    
    // ****************************************************************************************************************************
    // COLLECT SPECIAL ITEM *******************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.COLLECT_SPECIAL )
    {
        // CULLING --------------------------------------------------------------------------------------------------
        this.computeBlockVisibility();
        
        // MAP POSITION --------------------------------------------------------------------------------------------------
        this.mapPos += deltaTime * this.speed;
        
        // PATH & CAMERA -----------------------------------------------------------------------------------------------------
        this.updatePathAndCamera( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------        
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );

        // fx
        this.updateFX( deltaTime );
        
        // END
        if ( this.STATECOUNT[ this.STATE.COLLECT_SPECIAL ] > 1 )
        {
            //this.deltaTimeScale = 1;
            gsap.to( this, 0.5, { ease: Quad.easeIn, deltaTimeScale: 1 } );
            this.state = this.STATE.RUNNING;
        }
    }
    
    // ****************************************************************************************************************************
    // TRANSFORM ******************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.TRANSFORM )
    {        
        // PHYSICS -----------------------------------------------------------------------------------------------------        
        this.physicsNeedUpdate = false;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );

        if ( this.STATECOUNT[ this.state ] > this.player.animations.TRANSFORM.len )
        {
            this.player.setState( this.player.STATES.VEHICLE );
            
            // set speed            
            if ( this.levelId === 0 )
            {
                this.app.camera.setFOV( 70 );
                
                this.speed = this.defaultSpeed * 1.25;
                
                this.vehicleLaneMax = 1;
                this.vehicleLaneMin = -1;
                
                gsap.to( this.app.camera.container.position, 1, { ease: Sine.easeInOut, z: 0.0 } );
            }
            else if ( this.levelId === 1 )
            {
                this.app.camera.setFOV( 70 );
                
                this.speed = this.defaultSpeed * 1.3;
                
                this.vehicleLaneMax = 1;
                this.vehicleLaneMin = -1;
                
                gsap.to( this.app.camera.container.position, 1, { ease: Sine.easeInOut, z: 0.8 } );
                this.lastHeight = -1; // set initial flying height
            }
            else if ( this.levelId === 2 )
            {
                this.app.camera.setFOV( 70 );
                this.camAddY = 1.5;
                
                this.speed = this.defaultSpeed * 1.25;
                
                this.vehicleLaneMax = 1;
                this.vehicleLaneMin = -1;
                
                gsap.to( this.app.camera.container.position, 1, { ease: Sine.easeInOut, z: 0.6 } );
            }
            
            // change state
            this.state = this.STATE.VEHICLE;
        }
    }
    
    // ****************************************************************************************************************************
    // VEHICLE ********************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.VEHICLE )
    {
        // CULLING --------------------------------------------------------------------------------------------------
        this.computeBlockVisibility();
        
        // MAP POSITION --------------------------------------------------------------------------------------------------
        this.mapPos += deltaTime * this.speed;

        // INPUT -----------------------------------------------------------------------------------------------------
        this.checkVehicleInput( deltaTime );

        // PATH & CAMERA -----------------------------------------------------------------------------------------------------
        this.updatePathAndCamera( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------        
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );  
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );

        // fx
        this.updateFX( deltaTime );

        // CHECK VEHICLE ENERGY ------------------------------------------------------------------------------------------
        this.updateVehicleStateCount( deltaTime );
    }
    
    // ****************************************************************************************************************************
    // VEHICLE_COLLISION **********************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.VEHICLE_COLLISION )
    {
        // CULLING --------------------------------------------------------------------------------------------------
        this.computeBlockVisibility();
        
        // PROGRESS MAP POSITION --------------------------------------------------------------------------------------------------
        this.mapPos += deltaTime * this.speed;
        
        // check statecount
        if ( this.STATECOUNT[ this.state ] > 0.75 )
        {
            this.recoverVehicle();
        }
        
        // PATH & CAMERA -----------------------------------------------------------------------------------------------------        
        this.updatePathAndCamera( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );
        
        // fx
        this.updateFX( deltaTime );
        
        // CHECK VEHICLE ENERGY ------------------------------------------------------------------------------------------
        this.updateVehicleStateCount( deltaTime );
    }
    
    // ****************************************************************************************************************************
    // SCRIPTED_EVENT *************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.SCRIPTED_EVENT )
    {
        deltaTime *= this.scriptedEventTimeScale;
        
        // CULLING --------------------------------------------------------------------------------------------------
        this.computeBlockVisibility();
        
        // MAP POSITION --------------------------------------------------------------------------------------------------
        this.mapPos += deltaTime * this.speed;
        
        // PATH & CAMERA -----------------------------------------------------------------------------------------------------
        this.updatePathAndCamera( deltaTime );
        
        // INPUT -----------------------------------------------------------------------------------------------------
        this.checkInput( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------        
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );
        
        // fx
        this.updateFX( deltaTime );
        
        if ( this.STATECOUNT[ this.state ] > this.scriptedEventDuration )
        {
            this.state = this.scriptedEventLastState;
            this.ecsDeltaTimeScale = 1;
        }
    }
    
    // ****************************************************************************************************************************
    // PAUSED ****************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.PAUSED )
    {
    }
    
    // ****************************************************************************************************************************
    // USE_EXTRALIFE ****************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.USE_EXTRALIFE )
    {
        // CULLING --------------------------------------------------------------------------------------------------
        this.computeBlockVisibility();
        
        // PROGRESS MAP POSITION --------------------------------------------------------------------------------------------------
        this.mapPos += deltaTime * this.speed;
        
        // check statecount
        if ( this.STATECOUNT[ this.state ] > 1.5 )
        {
            this.recover();
        }
        else if ( this.STATECOUNT[ this.state ] > 0.2 )
        {
            this.deltaTimeScale = 0.1;
            this.ecsDeltaTimeScale = 5;
        }
        
        // PATH & CAMERA -----------------------------------------------------------------------------------------------------        
        this.updatePathAndCamera( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );
        
        // fx
        this.updateFX( deltaTime );
    }
    
    // ****************************************************************************************************************************
    // GAME OVER ****************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.GAMEOVER )
    {
        // PROGRESS MAP POSITION --------------------------------------------------------------------------------------------------        
        this.mapPos += deltaTime * this.speed;
        
        // PATH & CAMERA -----------------------------------------------------------------------------------------------------        
        this.updatePathAndCamera( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );
        
        // fx
        this.updateFX( deltaTime );
    }
    
    // ****************************************************************************************************************************
    // LEVEL_COMPLETE *************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.LEVEL_COMPLETE )
    {        
        // CULLING --------------------------------------------------------------------------------------------------
        this.computeBlockVisibility();
        
        // PROGRESS MAP POSITION --------------------------------------------------------------------------------------------------
        this.mapPos += deltaTime * this.speed;
        
        // PATH & CAMERA -----------------------------------------------------------------------------------------------------        
        this.updatePathAndCameraFinish( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );
        
        // fx
        this.updateFX( deltaTime );
    }
    
    // ****************************************************************************************************************************
    // CHEN APPEARS ***************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.CHEN_APPEARS )
    {
        deltaTime *= this.scriptedEventTimeScale;
        
        // CULLING --------------------------------------------------------------------------------------------------
        this.computeBlockVisibility();
        
        // MAP POSITION --------------------------------------------------------------------------------------------------
        this.mapPos += deltaTime * this.speed;
        
        // PATH & CAMERA -----------------------------------------------------------------------------------------------------
        this.updatePathAndCamera( deltaTime );
   
        // INPUT -----------------------------------------------------------------------------------------------------
        this.checkInput( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------    
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );
        
        // CHEN UPDATE --------------------------------------------------------------------------------------------------------
        this.chen.onUpdate( deltaTime );
        
        // fx
        this.updateFX( deltaTime );
        
        // CHECK STATE -----------------------------------------------------------------------------------------------------
        if ( this.STATECOUNT[ this.STATE.CHEN_APPEARS ] > 3 )
        {
            this.drawGoldenWeapon();
        }
    }
    
    // ****************************************************************************************************************************
    // DRAW GOLDEN WEAPON *********************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.DRAW_GOLDEN_WEAPON )
    {        
        // PHYSICS -----------------------------------------------------------------------------------------------------        
        this.physicsNeedUpdate = false;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );

        if ( this.STATECOUNT[ this.state ] > this.player.animations.GOLDEN_WEAPON_DRAW.len )
        {
            this.useGoldenWeapon();
        }
    }
    
    // ****************************************************************************************************************************
    // CHEN FIGHTS ****************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.CHEN_FIGHTS )
    {        
        // CULLING --------------------------------------------------------------------------------------------------
        this.computeBlockVisibility();
        
        // MAP POSITION --------------------------------------------------------------------------------------------------
        this.mapPos += deltaTime * this.speed;
        
        // PATH & CAMERA -----------------------------------------------------------------------------------------------------
        this.updatePathAndCamera( deltaTime );
   
        // INPUT -----------------------------------------------------------------------------------------------------
        this.checkInput( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------
        // prevent shooting up
        if ( 
                this.player.state !== this.player.STATES.JUMP &&
                this.player.state !== this.player.STATES.STRAFE_L &&
                this.player.state !== this.player.STATES.STRAFE_R
           )
        {
            if ( this.player.body.velocity.y > 0 ) this.player.body.velocity.y = 0;
        }
    
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );
        
        // CHEN UPDATE --------------------------------------------------------------------------------------------------------
        this.chen.onUpdate( deltaTime );
        
        // fx
        this.updateFX( deltaTime );
    }
    
    // ****************************************************************************************************************************
    // LOST ONE PLAYER ************************************************************************************************************
    // ****************************************************************************************************************************
    
    else if ( this.state === this.STATE.LOST_ONE_PLAYER )
    {
        // PROGRESS MAP POSITION --------------------------------------------------------------------------------------------------        
        this.mapPos += deltaTime * this.speed;
        
        // PATH & CAMERA -----------------------------------------------------------------------------------------------------        
        this.updatePathAndCamera( deltaTime );
        
        // PHYSICS -----------------------------------------------------------------------------------------------------
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;
        
        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );
        
        // CHEN -----------------------------------------------------------------------------------------------------
        this.chen.onUpdate( deltaTime );
        
        // fx
        this.updateFX( deltaTime );
        
        if ( this.STATECOUNT[ this.state ] > 2 )
        {
            this.state = this.STATE.PREPARE_NEXT_PLAYER;
            
            if ( this.playerId < 3 )
            {
                setTimeout( this.prepareNextPlayer.bind( this ), 500 );
                this.hud.hideGoldenNinjas();
            }
            else
            {
                setTimeout( this.gameOver.bind( this ), 500 );
            }
        }
    }
        
    // ****************************************************************************************************************************
    // CHEN DIES ******************************************************************************************************************
    // ****************************************************************************************************************************

    else if ( this.state === this.STATE.CHEN_DIES )
    {
        // MAP POSITION --------------------------------------------------------------------------------------------------
        this.mapPos += deltaTime * this.speed;

        // PATH & CAMERA -----------------------------------------------------------------------------------------------------
        this.updatePathAndCamera( deltaTime );

        // PHYSICS -----------------------------------------------------------------------------------------------------
        this.alignPlayerBody();
        if ( this.app.fps > 30 ) this.updatePhysics( deltaTime );
        this.physicsNeedUpdate = true;

        // PLAYER DISPLAY -----------------------------------------------------------------------------------------------------
        this.player.onUpdate( deltaTime );

        // CHEN UPDATE --------------------------------------------------------------------------------------------------------
        this.chen.onUpdate( deltaTime );

        // fx
        this.updateFX( deltaTime );
        
        if ( this.STATECOUNT[ this.state ] > 4 )
        {
            this.setChenDead();
        }
    }
    
    // ****************************************************************************************************************************
    // CHEN DEAD ******************************************************************************************************************
    // ****************************************************************************************************************************

    else if ( this.state === this.STATE.CHEN_DEAD )
    {
        // fx
        this.updateFX( deltaTime );
        
        // check state
        if ( this.STATECOUNT[ this.state ] > 3 )
        {
            this.gameComplete();
        }
    }
    
    // ****************************************************************************************************************************
    // GAME_COMPLETE **************************************************************************************************************
    // ****************************************************************************************************************************

    else if ( this.state === this.STATE.GAME_COMPLETE )
    {
        // update players
        let i = 0;
        
        for( i; i < 3; i++ )
        {
            this.players[i].animMixer.fastUpdate( deltaTime );
            this.simpleLocalToGlobal( this.players[i] );
        }
        
        // fx
        this.updateFX( deltaTime );
        
        // check state
        if ( this.STATECOUNT[ this.state ] > 5 )
        {
            this.showOutro();
        }
    }
    
    else if ( this.state === this.STATE.OUTRO )
    {
        if ( this.STATECOUNT[ this.state ] > 1 )
        {
            this.app.canvas.style.visibility = "hidden";
        }
    }

    // ECS updates ---------------------------------------------------------------------------------------------------
    this.updateECS( deltaTime * this.ecsDeltaTimeScale );
    
    // hud
    this.hud.onUpdate( deltaTime );

    // debug
    if ( this.jsonData.debugCamera ) this.orbitControls.update();
    
    // RENDER ---------------------------------------------------------------------------------------------------    
    this.render();
};
// </editor-fold>

Level.prototype.computeBlockVisibility = function() // <editor-fold defaultstate="collapsed">
{
    // special: loop for level 3
    if ( this.levelId === 3 )
    {
        if ( this.mapPos > 76.6667 )
        {
            this.mapPos = 30;
            this.pathAnim.play( "PATH", this.mapPos );
            this.camLookAtAnim.play( "CAM_LOOKAT", this.mapPos + 0.8 );
            this.pathAnim.update( 0 );
            this.camLookAtAnim.update( 0 );
            
            this.pathFollow.position.copy( this.path.position );
            
            this.player.localPosWorldRotation.copy( this.player.localPos ).applyQuaternion( this.path.quaternion );
            this.player.worldQuat.copy( this.path.quaternion );
            this.player.worldPos.x = this.path.position.x + this.player.localPosWorldRotation.x;
            this.player.worldPos.y = this.path.position.y + this.player.localPosWorldRotation.y;
            this.player.worldPos.z = this.path.position.z + this.player.localPosWorldRotation.z;
            this.player.body.position.x = this.player.worldPos.x;
            this.player.body.position.z = this.player.worldPos.z;
            this.player.body.quaternion.copy( this.player.worldQuat );
        }
    }
    
    // compute current block
    this.currentBlock = Math.floor( this.mapPos * 0.3 );
    
    // we've reached the end, so abort
    if ( this.currentBlock > this.levelparser.blocks.length - 1 ) return;
    
    // get laneMax
    this.laneMax = this.levelparser.blocks[ this.currentBlock ].block.laneMax;
    
    if ( this.currentBlock !== this.lastBlock )
    {
        // fixed physics update,
        // as on mobile the shadowmap generation
        // sometimes creates a hickup which makes playing harder
        this.updatePhysicsFixed = true;

        let physics;
        let len = 0;
        let i = 0;
        
        // remove last block's physics

        if ( this.lastBlock > 0 )
        {
            physics = this.levelparser.blocks[ this.lastBlock - 1 ].physics;
            len = physics.length;
            
            for ( i = 0; i < len; i++ )
            {
                this.app.physics.world.remove( physics[i] );
                
                if ( this.debug ) 
                {
                    if ( physics[i].debugMesh ) physics[i].debugMesh.visible = false;
                }
            }
        }
        
        // add current block's physics
        
        physics = this.levelparser.blocks[ this.currentBlock ].physics;
        
        if ( physics )
        {
            len = physics.length;

            for ( i = 0; i < len; i++ )
            {
                this.app.physics.world.add( physics[i] );
                if ( this.debug ) 
                {
                    if ( physics[i].debugMesh ) physics[i].debugMesh.visible = true;
                }
            }
        }
        
        // we've reached the end, so abort
        if ( this.currentBlock + 1 > this.levelparser.blocks.length - 1 ) return;
        
        // add next block's physics
        physics = this.levelparser.blocks[ this.currentBlock + 1 ].physics;

        len = physics.length;

        for ( i = 0; i < len; i++ )
        {
            this.app.physics.world.add( physics[i] );
            if ( this.debug ) 
            {
                if ( physics[i].debugMesh ) physics[i].debugMesh.visible = true;
            }
        }

        // set current block's speed
        this.defaultSpeed = this.speed = this.levelparser.blocks[ this.currentBlock ].block.speed;

        // cache current block
        this.lastBlock = this.currentBlock;

        // set block visibility        
        this.minBlock = this.currentBlock - 2;
        this.maxBlock = this.currentBlock + 4;
        len = this.levelparser.blocks.length;

        if ( this.jsonData.debugCamera )
        {
            this.minBlock = -1;
            this.maxBlock = this.levelparser.blocks.length;
        }

        for ( i = 0; i < len; i++ )
        {
            this.levelparser.blocks[i].visible = ( i > this.minBlock && i < this.maxBlock );
        }
        
        // collect active updates        
        ECS.activeUpdates = [];
        
        for ( i = 0; i < ECS.updates.length; i++ )
        {
            if ( ECS.updates[i].sceneRoot.visible )
            {
                ECS.activeUpdates.push( ECS.updates[i] );
            }
        }
        
        if ( this.jsonData.mainLightShadowOpacity > 0 )
        {
            // compute shadow
           
            let scalar = Math.abs( this.app.dir_light.worldDirection.clone().dot( this.path.getWorldDirection() ) );
            scalar = ( 1 - scalar ) * 0.8 + 0.2;
           
            this.dirLightLookAt.lerpVectors( this.path.position, this.levelparser.blocks[ this.currentBlock + 1 ].position, scalar );
            this.app.dir_light.position.copy( this.dirLightLookAt ).add( this.mainDirLightPos );
            this.app.dir_light.lookAt( this.dirLightLookAt, this.up );
            this.app.dir_light.updateMatrix();

            this.app.dir_light.shadowPassEnabled = true;
            this.app.renderer.shadowMapPass.render( this.app.renderer.glCore, this.app.scene );
            this.app.dir_light.shadowPassEnabled = false;
        }
        
        // update hud
        this.hud.addDistance( this.currentBlock / ( this.levelparser.blocks.length - 2 ) );
        
        // update camera
        this.app.camera.setBlock( this.levelparser.blocks[ this.currentBlock ].block.camera, this.state !== this.STATE.READY );
        
        // debug
        if ( this.debug ) this.app.debugBox.innerHTML = this.currentBlock + " | " + this.app.debugBox.innerHTML;
    }
};
// </editor-fold>

Level.prototype.checkInput = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    // if locked, increase lock count & return
    if ( this.input.isLocked || this.player.state === this.player.STATES.DIE )
    {
        this.input.lockCount += deltaTime;
        if ( this.input.lockCount > 0.2 ) this.input.unlock();
        return;
    }

    // actual input
    if ( this.input.direction.x > 0 )
    {
        this.currentLane = Math.min( this.laneMax, this.currentLane + 1 );
        this.input.consume();
    }
    else if ( this.input.direction.x < 0 )
    {
        this.currentLane = Math.max( -this.laneMax, this.currentLane - 1 );
        this.input.consume();
    }
    else if ( this.input.direction.y < 0 )
    {
        if ( this.state !== this.STATE.CHEN_FIGHTS )
        {
            if ( this.player.state !== this.player.STATES.JUMP )
            {
                this.player.setState( this.player.STATES.JUMP );
                this.input.consume();
            }
        }
        else
        {
            this.player.setState( this.player.STATES.STRIKE_GOLDEN_WEAPON );
            this.input.consume();
        }
    }
    else if ( this.input.direction.y > 0 )
    {
        this.player.setState( this.player.STATES.CROUCH );
        this.input.consume();
    }

    // lane change?
    if ( this.currentLane != this.lastLane )
    {
        //this.input.isLocked = true;
        gsap.to( this.player.localPos, 0.25, { x: -this.currentLane * 0.52, ease: Sine.easeInOut, onComplete: this.unlockInput.bind( this ) } );
        gsap.to( this.app.camera.position, 0.3, { x: -this.currentLane * 0.48, ease: Sine.easeInOut } );
        
        if ( this.player.state !== this.player.STATES.STRIKE_GOLDEN_WEAPON )
        {
            if ( this.currentLane < this.lastLane )
            {
                this.player.setState( this.player.STATES.STRAFE_L );
            }
            else
            {
                this.player.setState( this.player.STATES.STRAFE_R );
            }
        }
        
        this.laneCache = this.lastLane;
        this.lastLane = this.currentLane;
    }
};
// </editor-fold>

Level.prototype.checkVehicleInput = function( deltaTime )  // <editor-fold defaultstate="collapsed">
{
    // if locked, increase lock count & return
    if ( this.input.isLocked )
    {
        this.input.lockCount += deltaTime;
        if ( this.input.lockCount > 0.2 ) this.input.unlock();
        return;
    }
    
    // supercar
    if ( this.levelId === 0 )
    {    
        // input
        if ( this.input.direction.x > 0 )
        {
            this.currentLane = Math.min( this.vehicleLaneMax, this.currentLane + 1 );
            this.input.consume();
        }
        else if ( this.input.direction.x < 0 )
        {
            this.currentLane = Math.max( this.vehicleLaneMin, this.currentLane - 1 );
            this.input.consume();
        }

        // lane change?
        if ( this.currentLane != this.lastLane )
        {
            this.input.isLocked = true;
            gsap.to( this.player.localPos, 0.35, { x: -this.currentLane * 0.52, ease: Quad.easeInOut, onComplete: this.unlockInput.bind( this ) } );
            gsap.to( this.app.camera.position, 0.5, { x: -this.currentLane * 0.48, ease: Quad.easeInOut } );

            if ( this.currentLane < this.lastLane )
            {
                this.player.setState( this.player.STATES.VEHICLE_L );
            }
            else
            {
                this.player.setState( this.player.STATES.VEHICLE_R );
            }

            this.laneCache = this.lastLane;
            this.lastLane = this.currentLane;
        }
    }
    // boulder blaster
    else if ( this.levelId === 1 )
    {        
        // input
        if ( this.input.direction.x > 0 )
        {
            this.currentLane = Math.min( this.vehicleLaneMax, this.currentLane + 1 );
            this.input.consume();
        }
        else if ( this.input.direction.x < 0 )
        {
            this.currentLane = Math.max( this.vehicleLaneMin, this.currentLane - 1 );
            this.input.consume();
        }

        // lane change?
        if ( this.currentLane != this.lastLane )
        {
            this.input.isLocked = true;
            gsap.to( this.player.localPos, 0.35, { x: -this.currentLane * 1.04, ease: Quad.easeInOut, onComplete: this.unlockInput.bind( this ) } );
            gsap.to( this.app.camera.position, 0.5, { x: -this.currentLane * 1.0, ease: Quad.easeInOut } ); // 0.6

            if ( this.currentLane < this.lastLane )
            {
                this.player.setState( this.player.STATES.VEHICLE_L );
            }
            else
            {
                this.player.setState( this.player.STATES.VEHICLE_R );
            }

            this.laneCache = this.lastLane;
            this.lastLane = this.currentLane;
        }
        
        if ( this.input.direction.y < 0 )
        {
            this.currentHeight = Math.min( this.heightMax, this.currentHeight + 1 );
            this.input.consume();
        }
        else if ( this.input.direction.y > 0 )
        {
            this.currentHeight = Math.max( this.heightMin, this.currentHeight - 1 );
            this.input.consume();
        }
        
        // height change?
        if ( this.currentHeight != this.lastHeight )
        {
            this.input.isLocked = true;
            gsap.to( this.player.localPos, 0.35, { y: this.currentHeight * 1.5 + 0.5, ease: Quad.easeInOut, onComplete: this.unlockInput.bind( this ) } );

            this.lastHeight = this.currentHeight;
        }
    }
    // titan mech
    if ( this.levelId === 2 )
    {    
        // input
        if ( this.input.direction.x > 0 )
        {
            this.currentLane = Math.min( this.vehicleLaneMax, this.currentLane + 1 );
            this.input.consume();
        }
        else if ( this.input.direction.x < 0 )
        {
            this.currentLane = Math.max( this.vehicleLaneMin, this.currentLane - 1 );
            this.input.consume();
        }
        
        if ( this.input.direction.y > 0 )
        {
            this.player.setState( this.player.STATES.VEHICLE_DOWN );
            this.input.consume();
        }
        else if ( this.input.direction.y < 0 )
        {
            this.player.setState( this.player.STATES.VEHICLE_UP );
            this.input.consume();
        }

        // lane change?
        if ( this.currentLane != this.lastLane )
        {
            this.input.isLocked = true;
            gsap.to( this.player.localPos, 0.35, { x: -this.currentLane * 0.52, ease: Quad.easeInOut, onComplete: this.unlockInput.bind( this ) } );
            gsap.to( this.app.camera.position, 0.5, { x: -this.currentLane * 0.48, ease: Quad.easeInOut } );

            if ( this.currentLane < this.lastLane )
            {
                this.player.setState( this.player.STATES.VEHICLE_L );
            }
            else
            {
                this.player.setState( this.player.STATES.VEHICLE_R );
            }

            this.laneCache = this.lastLane;
            this.lastLane = this.currentLane;
        }
    }
}
// </editor-fold>

Level.prototype.updatePathAndCamera = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    // animate path & camLookAt
    this.pathAnim.fastUpdate( deltaTime * this.speed );
    this.camLookAtAnim.fastUpdate( deltaTime * this.speed );

    // compute camera parent
    if ( this.state !== this.STATE.GAMEOVER )
    {
        this.pathFollow.position.x = ( this.pathFollow.position.x + this.path.position.x ) * 0.5;
        this.pathFollow.position.y = ( this.pathFollow.position.y + this.path.position.y ) * 0.5;
        this.pathFollow.position.z = ( this.pathFollow.position.z + this.path.position.z ) * 0.5;
    }
    else
    {
        this.pathFollow.position.copy( this.path.position );
    }
    
    let lerp = this.levelparser.blocks[ this.currentBlock ].block.lookAtFactor + 0.001;
    let oneMinusLerp = 1 - lerp;
    this.halfForward.x = this.path.position.x * oneMinusLerp + this.camLookAt.position.x * lerp;
    this.halfForward.y = this.path.position.y * oneMinusLerp + this.camLookAt.position.y * lerp;
    this.halfForward.z = this.path.position.z * oneMinusLerp + this.camLookAt.position.z * lerp;
    
    //this.pathFollow.lookAt( this.camLookAt.position, this.up );
    if ( this.state !== this.STATE.GAMEOVER ) 
    {
        this.pathFollow.lookAt( this.halfForward, this.up );
    };

    // adjust camera height
    this.camHeight -= ( this.camHeight - this.player.body.position.y + this.path.position.y - this.camAddY ) * 0.25;
    
    if ( this.player.state === this.player.STATES.CROUCH )
    {
        this.camCrouch -= ( this.camCrouch + 0.4 ) * 0.25;
    }
    else
    {
        this.camCrouch -= ( this.camCrouch - 0 ) * 0.25;
    }
    
    this.camY = this.camHeight + this.camCrouch;
    this.app.camera.container.position.y -= ( this.app.camera.container.position.y - this.camY ) * 0.25;
    
    // skybox
    this.skybox.position.copy( this.path.position );
}
// </editor-fold>

Level.prototype.updatePathAndCameraFinish = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    // animate path & camLookAt
    this.pathAnim.fastUpdate( deltaTime * this.speed );
    
    // camera
    this.pathFollow.position.add( this.app.camera.finalSlowdown );
    
    // skybox
    this.skybox.position.copy( this.path.position );
}
// </editor-fold>

Level.prototype.alignPlayerBody = function() // <editor-fold defaultstate="collapsed">
{
    // compute player pos

    this.player.localPosWorldRotation.copy( this.player.localPos ).applyQuaternion( this.path.quaternion );
    this.player.worldQuat.copy( this.path.quaternion );
   
    this.player.worldPos.x = ( this.player.worldPos.x + this.path.position.x + this.player.localPosWorldRotation.x ) * 0.5;
    this.player.worldPos.y = ( this.player.worldPos.y + this.path.position.y + this.player.localPosWorldRotation.y ) * 0.5;
    this.player.worldPos.z = ( this.player.worldPos.z + this.path.position.z + this.player.localPosWorldRotation.z ) * 0.5;

    // compute player quat
    if ( this.state !== this.STATE.VEHICLE && this.state !== this.STATE.VEHICLE_COLLISION )
    {
        this.player.body.position.x = this.player.worldPos.x;
        this.player.body.position.z = this.player.worldPos.z;
        this.player.body.quaternion.copy( this.player.worldQuat );
    }
    else
    {
        if ( this.levelId === 0 )
        {
            this.player.body.position.x = this.player.worldPos.x;
            this.player.body.position.z = this.player.worldPos.z;

            this.vehiclePosHelper.lerpVectors( this.path.position, this.camLookAt.position, 0.2 );
            this.vehicleQuatHelper.position.copy( this.path.position );
            this.vehicleQuatHelper.lookAt( this.vehiclePosHelper, this.up );
            this.player.body.quaternion.copy( this.vehicleQuatHelper.quaternion );
        }
        else if ( this.levelId === 1 )
        {
            this.player.body.position.x = this.player.worldPos.x;
            this.player.body.position.y = this.player.worldPos.y;
            this.player.body.position.z = this.player.worldPos.z;

            this.vehiclePosHelper.lerpVectors( this.path.position, this.camLookAt.position, 0.2 );
            this.vehicleQuatHelper.position.copy( this.path.position );
            this.vehicleQuatHelper.lookAt( this.vehiclePosHelper, this.up );
            this.player.body.quaternion.copy( this.vehicleQuatHelper.quaternion );
        }
        else if ( this.levelId === 2 )
        {
            this.player.body.position.x = this.player.worldPos.x;
            this.player.body.position.z = this.player.worldPos.z;

            this.vehiclePosHelper.lerpVectors( this.path.position, this.camLookAt.position, 0.2 );
            this.vehicleQuatHelper.position.copy( this.path.position );
            this.vehicleQuatHelper.lookAt( this.vehiclePosHelper, this.up );
            this.player.body.quaternion.copy( this.vehicleQuatHelper.quaternion );
        }
    }
    
    // kill any velocity but y for gravity
    this.player.body.velocity.x = this.player.body.velocity.z = 0;
}
// </editor-fold>

Level.prototype.updatePhysics = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    // world step
    this.app.physics.onUpdate( deltaTime, this.updatePhysicsFixed );
    this.updatePhysicsFixed = false;
}
// </editor-fold>

Level.prototype.interleavedPhysicsUpdate = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    deltaTime *= this.deltaTimeScale * this.slowmo.timeScale;
    // world step
    this.app.physics.onUpdate( deltaTime );
}
// </editor-fold>

Level.prototype.updateECS = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    let i;
    let cnt = 0;
    
    for ( i = 0; i < ECS.activeUpdates.length; i++ )
    {
        if ( ECS.activeUpdates[i].enabled )
        {
            cnt++;
            ECS.activeUpdates[i].onUpdate( deltaTime );
        }
    }
}
// </editor-fold>

Level.prototype.updateFX = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    if ( this.state > this.STATE.INTRO )
    {    
        let dustTarget = new zen3d.Vector3().copy( this.player.dustTarget );
        dustTarget.applyQuaternion( this.path.quaternion );

        // set dust position
        this.dust.display.position.x = this.player.body.position.x + dustTarget.x;
        this.dust.display.position.z = this.player.body.position.z + dustTarget.z;

        if ( this.player.state !== this.player.STATES.JUMP )
        {
            this.dust.display.position.y = this.player.body.position.y + dustTarget.y;
        }

        // set dust opacity
        if ( this.player.state === this.player.STATES.JUMP ||
             this.player.state === this.player.STATES.DIE )
        {
            this.dust.setOpacity( 0, true );
        }
        else
        {
            this.dust.setOpacity( 1, true );
        }

        // update dust anim
        this.dust.onUpdate( deltaTime );
    }

    // stars
    this.stars.display.position.z = 0;
    this.stars.onUpdate( deltaTime );

    // explosion
    for ( let i = 0; i < this.explosions.length; i++ )
    {
        this.explosions[i].onUpdate( deltaTime );
    }
    
    // sparks
    this.sparks.onUpdate( deltaTime );
    
    // snow
    if ( this.levelId === 2 )
    {
        this.snowstorm.onUpdate( deltaTime );
    }
}
// </editor-fold>

Level.prototype.updateVehicleStateCount = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    this.player.vehicleStateCount -= deltaTime;
    this.hud.Icon_Vehicle_Update( this.player.vehicleStateCount );

    if ( this.player.vehicleStateCount <= 0 )
    {
        this.player.setState( this.player.STATES.TRANSFORM_REVERSE );
        this.alignPlayerBody();
        this.player.body.position.y = this.player.worldPos.y;
        this.player.body.velocity.set( 0, 0, 0 );

        this.hud.Icon_Vehicle_Hide();

        // reset camera
        this.app.camera.setFOV( 40 );
        this.camAddY = 0;
        gsap.to( this.app.camera.container.position, 1, { ease: Sine.easeInOut, x: 0, y: 0, z: 0 } );

        this.speed = this.defaultSpeed;

        // reset state
        this.state = this.STATE.RUNNING;
    }
}
// </editor-fold>

Level.prototype.render = function() // <editor-fold defaultstate="collapsed">
{
    /*
    let worldPos = AppUtils.getPositionFromMatrix( this.path.worldMatrix );
    this.app.dir_light_2.position.set( worldPos.x + this.mainDirLightPos.x * 0.02, worldPos.y + this.mainDirLightPos.y * 0.02, worldPos.z + this.mainDirLightPos.z * 0.02 );
    this.app.dir_light_2.lookAt( new zen3d.Vector3( worldPos.x, worldPos.y, worldPos.z ), this.up );
    this.app.renderer.shadowMapPass.render( this.app.renderer.glCore, this.app.scene );
    this.app.dir_light.shadowPassEnabled = false;
    */

    if ( !this.jsonData.debugCamera )
    {
        if ( this.state === this.STATE.TRANSFORM || this.state === this.STATE.DRAW_GOLDEN_WEAPON )
        {
            this.app.renderer.render( this.app.scene, this.player.cam );
        }
        else
        {
            this.app.renderer.render( this.app.scene, this.app.camera.camera );
        }
    }
    else
    {
        this.app.renderer.render( this.app.scene, this.debugCamera );
    }
}
// </editor-fold>

Level.prototype.collectStandardBrick = function() // <editor-fold defaultstate="collapsed">
{
    // fx
    this.stars.setStartTime( true );
    
    // hud
    this.hud.addStandardBrick();
}
// </editor-fold>

Level.prototype.collectGoldenBrick = function() // <editor-fold defaultstate="collapsed">
{
    // fx
    this.stars.setStartTime( true );
    
    // hud
    this.hud.addGoldenBrick();
}
// </editor-fold>

Level.prototype.startVehicle = function() // <editor-fold defaultstate="collapsed">
{
    this.speed = 0;    
    this.player.setState( this.player.STATES.TRANSFORM );
    this.player.cam.setPerspective( 40 / 180 * Math.PI, this.app.aspectRatio, 0.1, 100 );

    this.hud.Icon_Vehicle_Show();
    
    this.alignPlayerBody();
    this.player.body.position.y = this.player.worldPos.y;
    this.player.body.velocity.set( 0, 0, 0 );

    this.state = this.STATE.TRANSFORM;
}
// </editor-fold>

Level.prototype.unlockInput = function() // <editor-fold defaultstate="collapsed">
{
    if ( this.player.state !== this.player.STATES.DIE )
    {
        this.input.unlock();
    }
}
// </editor-fold>

Level.prototype.fatalCollision = function( entity, camSpeed ) // <editor-fold defaultstate="collapsed">
{
    this.collisionTime = this.mapPos - this.currentBlock * 3.333333;
    
    // check oneup
    if ( this.extralife > 0 )
    {
        //entity.enabled = false;
        
        this.extralife--;
        this.state = this.STATE.USE_EXTRALIFE;
        this.deltaTimeScale = 1;
        this.speed = -1;
        this.player.setState( this.player.STATES.DIE );
        this.hud.useExtraLife();
    }
    else
    {
        this.gameOver( camSpeed );
    }
};
// </editor-fold>

Level.prototype.recover = function() // <editor-fold defaultstate="collapsed">
{ 
    // get safepath position   
    let safePos = this.levelparser.blocks[ this.currentBlock ].block.safepath.getPositionAtTime( this.collisionTime );
    
    if ( safePos.x < -0.1 )
    {
        this.currentLane = 1;
    }
    else if ( safePos.x > 0.1 )
    {
        this.currentLane = -1;
    }
    else
    {
        this.currentLane = 0;
    }
   
    // set player position
    //this.player.localPos.x = safePos.x;
    this.player.body.position.y = this.path.position.y + safePos.y;
    this.player.body.velocity.set( 0, 0, 0 );
    
    this.player.setState( this.player.STATES.JUMP );
    this.player.blinkCount = 1;
    
    // set level states
    this.speed = this.defaultSpeed;
    this.deltaTimeScale = 1;
    this.ecsDeltaTimeScale = 1;
    this.state = this.STATE.RUNNING;
};
// </editor-fold>

Level.prototype.fatalVehicleCollision = function( other, collisionPos ) // <editor-fold defaultstate="collapsed">
{
    // physics
    other.entity.enabled = false;
    this.input.isLocked = true;

    // check vehicle energy
    this.state = this.STATE.VEHICLE_COLLISION;
    this.deltaTimeScale = 0.25;
    
    // set explosion
    this.currentExplosion++;
    if ( this.currentExplosion > this.explosions.length - 1 ) this.currentExplosion = 0;
    
    this.explosions[ this.currentExplosion ].display.position.copy( collisionPos );
    this.explosions[ this.currentExplosion ].display.scale.set( 2, 2, 2 );
    this.explosions[ this.currentExplosion ].setStartTime();
    
    // set sparks
    this.sparks.display.position.copy( collisionPos );
    this.sparks.setStartTime();
    
    // player blink
    this.player.blinkCount = 1;
    this.player.vehicleStateCount --;
    
    // hud
    this.hud.shake = 1;
    
    // get safepath position  
    this.collisionTime = this.mapPos - this.currentBlock * 3.333333;
    let safePos = this.levelparser.blocks[ this.currentBlock ].block.safepath_vehicle.getPositionAtTime( this.collisionTime );
    
    if ( safePos.x < -0.1 )
    {
        this.lastLane = this.currentLane = 1;
    }
    else if ( safePos.x > 0.1 )
    {
        this.lastLane = this.currentLane = -1;
    }
    else
    {
        this.lastLane = this.currentLane = 0;
    }
    
    if ( this.levelId === 0 )
    {
        gsap.to( this.player.localPos, 0.75, { ease: Quad.easeOut, x: -this.currentLane * 1.04, onComplete: this.unlockInput.bind( this ) } );
        gsap.to( this.app.camera.position, 0.75, { ease: Quad.easeOut, x: -this.currentLane * 1.0 } );

        if ( safePos.x > this.player.localPos.x )
        {
            this.player.addRotation( 0.7, 1, 0.2, 0.3, Math.random() - 0.5 );
            this.player.addTranslation( 0.7, 1, 0, 0.2, 0 );
        }
        else
        {
            this.player.addRotation( 0.7, 1, 0.2, -0.3, Math.random() - 0.5 );
            this.player.addTranslation( 0.7, 1, 0, 0.4, 0 );
        }
        
        // stone or cactus explosion
        if ( other.entity.type === ECS.TYPE.STONE )
        {
            this.stoneCollision.start( other.position, this.path.quaternion );
            other.entity.display.visible = false;
            other.collisionResponse = false;
            other.entity.enabled = false;
        }
        else if( other.entity.type === ECS.TYPE.CACTUS )
        {
            this.cactusCollision.start( other.position, this.path.quaternion );
            other.entity.display.visible = false;
            other.collisionResponse = false;
            other.entity.enabled = false;
        }
    }    
    else if ( this.levelId === 1 )
    {
        if ( safePos.y < 1 )
        {
            this.lastHeight = this.currentHeight = 0;
        }
        else
        {
            this.lastHeight = this.currentHeight = 1;
        }
    
        gsap.to( this.player.localPos, 0.75, { ease: Quad.easeOut, x: -this.currentLane * 1.04, y: this.currentHeight * 1.5 + 0.5, onComplete: this.unlockInput.bind( this ) } );
        gsap.to( this.app.camera.position, 0.75, { ease: Quad.easeOut, x: -this.currentLane * 1.0 } );

        if ( safePos.x > this.player.localPos.x )
        {
            this.player.addRotation( 1, 1, 0.2, 0.1, -0.7 );
        }
        else
        {
            this.player.addRotation( 1, 1, 0.2, 0.1, 0.7 );
        }
    }
    else if ( this.levelId === 2 )
    {
        gsap.to( this.player.localPos, 0.75, { ease: Quad.easeOut, x: -this.currentLane * 1.04, onComplete: this.unlockInput.bind( this ) } );
        gsap.to( this.app.camera.position, 0.75, { ease: Quad.easeOut, x: -this.currentLane * 1.0 } );
    }
}
// </editor-fold>

Level.prototype.recoverVehicle = function() // <editor-fold defaultstate="collapsed">
{
    this.player.blinkTimer = 2;
    
    // set level states
    this.speed = this.defaultSpeed;
    this.deltaTimeScale = 1;
    this.ecsDeltaTimeScale = 1;
    this.state = this.STATE.VEHICLE;
};
// </editor-fold>

Level.prototype.gameOver = function( speed ) // <editor-fold defaultstate="collapsed">
{
    if ( this.state === this.STATE.GAMEOVER ) return;
    
    // audio
    this.app.audio.stop( "level_music" );
    this.app.audio.play( "fail" );
    
    // state
    this.state = this.STATE.GAMEOVER;
    this.player.setState( this.player.STATES.DIE );
    
    // kill tweens
    gsap.killTweensOf( this.player.localPos );
    
    // input
    this.input.isLocked = true;

    // map progress
    if ( speed ) this.speed = speed;
    gsap.to( this, 1, { ease: Quad.easeOut, speed: 0 } );
    
    // camera
    this.app.camera.killAllTweens();
    
    if ( this.levelId < 3 )
    {
        if ( speed < 0 )
        {
            gsap.to( this.app.camera.euler, 1, { ease: Quad.easeOut, x: this.app.camera.euler.x + 0.4 } );
            this.app.camera.shake( 0.5 );
        }
        else
        {
            gsap.to( this.app.camera.euler, 1, { ease: Quad.easeOut, x: this.app.camera.euler.x + 1.2 } );
        }
    }
    
    // specials
    this.magnet.timer = 0;
    this.slowmo.timer = 0;
    this.slowmo.timeScale = 1;

    this.hud.showResultScreen( false );
    
    // debug
    if ( this.jsonData.showDebugPanel )
    {
        this.debugStartPanel.style.visibility = "inherit";
    }
};
// </editor-fold>

Level.prototype.fatalGoldenCollision = function( camSpeed ) // <editor-fold defaultstate="collapsed">
{
    if ( this.player.state === this.player.STATES.STRIKE_GOLDEN_WEAPON ) return;
    
    this.collisionTime = this.mapPos - this.currentBlock * 3.333333;
    
    // check oneup
    if ( this.extralife > 0 )
    {
        //entity.enabled = false;
        
        this.extralife--;
        this.state = this.STATE.USE_EXTRALIFE;
        this.deltaTimeScale = 1;
        this.speed = -1;
        this.player.setState( this.player.STATES.DIE );
        this.hud.useExtraLife();
    }
    else
    {
        this.lostOnePlayer( camSpeed );
    }
};
// </editor-fold>

Level.prototype.lostOnePlayer = function( speed ) // <editor-fold defaultstate="collapsed">
{
    if ( this.state === this.STATE.LOST_ONE_PLAYER ) return;
    
    // increase playerId
    this.playerId++;
    
    // audio
    this.app.audio.stop( "level_music" );
    this.app.audio.stop( "music_fight" );
    this.app.audio.play( "fail" );
    
    // state
    this.state = this.STATE.LOST_ONE_PLAYER;
    this.player.setState( this.player.STATES.DIE );
    
    // chen
    this.chen.setState( this.chen.STATES.RETREAT );
    
    // kill tweens
    gsap.killTweensOf( this.player.localPos );
    
    // input
    this.input.isLocked = true;

    // map progress & camera
    this.speed = speed;
    gsap.to( this, 1, { ease: Quad.easeOut, speed: 0 } );
    this.app.camera.killAllTweens();

    if ( speed < 0 )
    {
        gsap.to( this.app.camera.euler, 1, { ease: Quad.easeOut, x: this.app.camera.euler.x + 0.4 } );
        this.app.camera.shake( 0.5 );
    }
    else
    {
        gsap.to( this.app.camera.euler, 1, { ease: Quad.easeOut, x: this.app.camera.euler.x + 1.2 } );
    }

    this.hud.lostOnePlayer( this.playerId );
};
// </editor-fold>

Level.prototype.prepareFinish = function() // <editor-fold defaultstate="collapsed">
{   
    //gsap.to( this, 2, { ease: Quad.easeOut, speed: 0, onComplete: this.levelComplete.bind( this ) } );
    this.app.camera.finalSlowdown = this.pathFollow.getWorldDirection().multiplyScalar( 0.1 );
    gsap.to( this.app.camera.finalSlowdown, 2, { ease: Quad.easeOut, x: 0, y: 0, z: 0, onComplete: this.levelComplete.bind( this ) } );
    this.app.camera.setFOV( 60, 2 );
    
    this.state = this.STATE.LEVEL_COMPLETE;
    this.input.isLocked = true;
    
    this.app.audio.stop( "level_music" );
    this.app.audio.play( "success" );
}
// </editor-fold>

Level.prototype.levelComplete = function() // <editor-fold defaultstate="collapsed">
{
    this.player.setState( this.player.STATES.IDLE );
    
    this.dust.setStartTime();
    this.dust.setLoop( 1 );
    
    this.hud.showResultScreen( true );
    
    // debug
    if ( this.jsonData.showDebugPanel )
    {
        this.debugStartPanel.style.visibility = "inherit";
    }
}
// </editor-fold>

Level.prototype.onDebugStartButtonClick = function( event ) // <editor-fold defaultstate="collapsed">
{
    let blockLength = 0;
    
    for ( var i = 0; i < this.levelparser.randomBlockOrder.length; i++ )
    {
        if ( event.target.num === i )
        {
            this.mapStart = blockLength * 3.333333 + 1;
        }
        
        blockLength += this.levelparser.randomBlockOrder[i].length;
    }
    
    this.restartLevel();
}
// </editor-fold>

Level.prototype.restartLevel = function() // <editor-fold defaultstate="collapsed">
{
    // hud
    this.hud.fadeout();
    
    // fader
    setTimeout( this.restartLevelDelayed.bind( this ), 200 );
    
    // debug
    if ( this.jsonData.showDebugPanel )
    {
        this.debugStartPanel.style.visibility = "hidden";
    }
}
// </editor-fold>

Level.prototype.restartLevelDelayed = function() // <editor-fold defaultstate="collapsed">
{
    // remove CANNON bodies from world
    let i = 0;
    let len = ECS.entities.length;
    let entity;
    
    for ( i; i < len; i++ )
    {
        entity = ECS.entities[i];
        
        if ( entity.body && entity.body.world && entity.sceneRoot != this.app.scene )
        {
            this.app.physics.world.remove( entity.body );
        }
    }
    
    // reset entities
    SavepointManager.restoreSavepoint();
    
    // init positions, variables, player
    this.prepareStart();
}
// </editor-fold>

Level.prototype.scriptedEvent = function( timein, timehold, timeout, deltaTimeScale, ecsDeltaTimeScale, newPos, newEuler, newFov ) // <editor-fold defaultstate="collapsed">
{
    this.scriptedEventLastState = this.state;
    this.state = this.STATE.SCRIPTED_EVENT;
    this.scriptedEventDuration = timein + timehold + timeout;    
    //this.app.camera.killAllTweens();
    
    // timeline
    let timeline = gsap.timeline( { paused: true } );
    
    if ( timein > 0 )
    {    
        // deltaTimeScale
        timeline.to( this, 0.1, { ease: Sine.easeInOut, scriptedEventTimeScale: deltaTimeScale, ecsDeltaTimeScale: ecsDeltaTimeScale }, 0 );
        timeline.to( this, timeout, { ease: Sine.easeInOut, scriptedEventTimeScale: 1, ecsDeltaTimeScale: 1 }, timein + timehold );
        
        // physics
        timeline.to( this.app.physics, 0.1, { ease: Sine.easeInOut, fixedTimeStep: 1 / this.app.fps * deltaTimeScale }, 0 );
        timeline.to( this.app.physics, timeout, { ease: Sine.easeInOut, fixedTimeStep: 1 / this.app.fps }, timein + timehold );

        // position
        timeline.to( this.app.camera.camera.position, timein, { ease: Sine.easeInOut, x: newPos.x, y: newPos.y, z: newPos.z }, 0 );
        timeline.to( this.app.camera.camera.position, timeout, { ease: Sine.easeInOut, x: 0, y: 0, z: 0 }, timein + timehold );

        // rotation
        let newQuat = new zen3d.Quaternion().setFromEuler( newEuler );    
        timeline.to( this.app.camera.camera.quaternion, timein, { ease: Sine.easeInOut, x: newQuat.x, y: newQuat.y, z: newQuat.z, w: newQuat.w }, 0 );
        timeline.to( this.app.camera.camera.quaternion, timeout, { ease: Sine.easeInOut, x: 0, y: 0, z: 0, w: 1 }, timein + timehold );

        // FOV
        timeline.to( this.app.camera, timein, { ease: Sine.easeInOut, FOV: newFov * this.Deg2Rad, onUpdate: this.app.camera.updatePerspective.bind( this.app.camera ) }, 0 );
        timeline.to( this.app.camera, timeout, { ease: Sine.easeInOut, FOV: this.app.camera._FOV * this.Deg2Rad, onUpdate: this.app.camera.updatePerspective.bind( this.app.camera ) }, timein + timehold );
    }
    else
    {
        // deltaTimeScale
        timeline.set( this, { scriptedEventTimeScale: deltaTimeScale, ecsDeltaTimeScale: ecsDeltaTimeScale }, 0 );
        timeline.to( this, timeout, { ease: Sine.easeInOut, scriptedEventTimeScale: 1, ecsDeltaTimeScale: 1 }, timehold );
        
        // position
        timeline.set( this.app.camera.camera.position, { x: newPos.x, y: newPos.y, z: newPos.z }, 0 );
        timeline.to( this.app.camera.camera.position, timeout, { ease: Sine.easeInOut, x: 0, y: 0, z: 0 }, timehold );
        
        // rotation
        let newQuat = new zen3d.Quaternion().setFromEuler( newEuler );    
        timeline.set( this.app.camera.camera.quaternion, { x: newQuat.x, y: newQuat.y, z: newQuat.z, w: newQuat.w }, 0 );
        timeline.to( this.app.camera.camera.quaternion, timeout, { ease: Sine.easeInOut, x: 0, y: 0, z: 0, w: 1 }, timehold );
        
         // FOV
        timeline.set( this.app.camera, { FOV: newFov * this.Deg2Rad, onUpdate: this.app.camera.updatePerspective.bind( this.app.camera ) }, 0 );
        timeline.to( this.app.camera, timeout, { ease: Sine.easeInOut, FOV: this.app.camera._FOV * this.Deg2Rad, onUpdate: this.app.camera.updatePerspective.bind( this.app.camera ) }, timehold );
    }

    // done
    timeline.play();
    
    // audio
    this.app.audio.play( "danger" );
}
// </editor-fold>

Level.prototype.setLighting = function( mainPower, envMapIntensity, snowOpacity, ambientColor ) // <editor-fold defaultstate="collapsed">
{
    gsap.to( this.app.dir_light, 0.5, { ease: Linear.easeNone, intensity: mainPower + 0.00001 } );
    
    for ( let i = 0; i < this.levelparser.materials.length; i++ )
    {
        gsap.to( this.levelparser.materials[i], 0.5, { ease: Linear.easeNone, envMapIntensity: envMapIntensity + 0.00001 } );
    }

    if ( this.snowstorm && snowOpacity !== undefined )
    {
        gsap.to( this.snowstorm.mat, 0.5, { ease: Linear.easeNone, opacity: snowOpacity + 0.00001 } );
    }
    
    if ( ambientColor !== undefined )
    {
        gsap.to( this.app.ambient.color, 0.5, { ease: Linear.easeNone, r: ambientColor.r, g: ambientColor.g, b: ambientColor.b } );
    }
}
// </editor-fold>

Level.prototype.setExplosion = function( worldPos ) // <editor-fold defaultstate="collapsed">
{
    // set explosion
    this.currentExplosion++;
    if ( this.currentExplosion > this.explosions.length - 1 ) this.currentExplosion = 0;
    
    this.explosions[ this.currentExplosion ].display.position.copy( worldPos );
    this.explosions[ this.currentExplosion ].display.scale.set( 2, 2, 2 );
    this.explosions[ this.currentExplosion ].setStartTime();
    
    // set sparks
    this.sparks.display.position.copy( worldPos );
    this.sparks.setStartTime();
}
// </editor-fold>

Level.prototype.letChenAppear = function() // <editor-fold defaultstate="collapsed">
{
    if ( this.state >= this.STATE.CHEN_APPEARS ) return;
    
    this.scriptedEvent( 1, 2, 0.5, 0.2, 1, new zen3d.Vector3( 0.1, -0.3, -0.5 ), new zen3d.Euler( 0.2, 0, 0 ), 40 );
    
    this.app.audio.stop( "level_music" );
    this.app.audio.play( "music_fight", true );
    
    this.state = this.STATE.CHEN_APPEARS;
    this.chen.setState( this.chen.STATES.APPEAR );
}
// </editor-fold>

Level.prototype.drawGoldenWeapon = function() // <editor-fold defaultstate="collapsed">
{
    this.speed = 0;    
    this.player.setState( this.player.STATES.DRAW_GOLDEN_WEAPON );
    this.player.cam.setPerspective( 40 / 180 * Math.PI, this.app.aspectRatio, 0.1, 100 );

    this.state = this.STATE.DRAW_GOLDEN_WEAPON;
}
// </editor-fold>

Level.prototype.useGoldenWeapon = function() // <editor-fold defaultstate="collapsed">
{
    this.speed = this.defaultSpeed;
    this.player.setState( this.player.STATES.GOLDEN_WEAPON );
    this.chen.setState( this.chen.STATES.IDLE );    
    this.state = this.STATE.CHEN_FIGHTS;
}
// </editor-fold>

Level.prototype.letChenRetreat = function() // <editor-fold defaultstate="collapsed">
{
    this.chen.setState( this.chen.STATES.RETREAT );
    this.state = this.STATE.RUNNING;
}
// </editor-fold>

Level.prototype.setChenDefeated = function() // <editor-fold defaultstate="collapsed">
{
    if ( this.state === this.STATE.CHEN_DIES ) return;
    
    // gsap timeline
    let timeline = gsap.timeline( { paused: true } );
    
    // slowdown
    timeline.to( this, 2, { ease: Sine.easeOut, speed: 0 }, 0 );
    
    // fade out dust
    timeline.to( this.dust.mat, 1, { ease: Linear.easeNone, opacity: 0 }, 0 );
    
    // camera
    timeline.to( this.app.camera.camera.position, 4, { ease: Sine.easeInOut, x: 0, y: 0, z: -4 }, 0 );
    timeline.to( this.app.camera.camera.euler, 4, { ease: Sine.easeInOut, x: 0.4 }, 0 );
    
    // play anim
    timeline.play();
    
    // set states
    this.player.setState( this.player.STATES.IDLE );
    this.chen.setState( this.chen.STATES.DIE );
    this.state = this.STATE.CHEN_DIES;
}
// </editor-fold>

Level.prototype.simpleLocalToGlobal = function( player ) // <editor-fold defaultstate="collapsed">
{
    player.localPosWorldRotation.copy( player.localPos ).applyQuaternion( this.path.quaternion );
    player.worldQuat.copy( this.path.quaternion );
   
    player.worldPos.x = this.path.position.x + player.localPosWorldRotation.x;
    player.worldPos.y = this.path.position.y + player.localPosWorldRotation.y;
    player.worldPos.z = this.path.position.z + player.localPosWorldRotation.z;
    
    player.display.position.copy( player.worldPos );
    player.display.quaternion.copy( player.worldQuat );
}
// </editor-fold>

Level.prototype.setChenDead = function() // <editor-fold defaultstate="collapsed">
{
    let i = 0;
    let exp;
    let scale = 0;
    
    for( i; i < this.explosions.length; i++ )
    {
        exp = this.explosions[i];
        exp.display.position.copy( this.chen.display.position );
        exp.display.position.x += Math.random() * 2 - 1;
        exp.display.position.y += Math.random() * 2 - 1;
        exp.display.position.z += Math.random() * 2 - 1;
        scale = Math.random() * 1 + 2;
        exp.display.scale.set( scale, scale, scale );
        exp.mat.uniforms.timing[0] = exp.time + i * 0.1;
        exp.mat.uniforms.timing[2] = 1;
    }
    
    // play ChenDeath anim
    let anim = this.levelparser.specials[ "ChenDeath" ];
    this.app.scene.add( anim.display );
    anim.start( this.chen.display.position, this.chen.display.quaternion );
    
    this.app.audio.stop( "level_music" );
    this.app.audio.stop( "music_fight" );
    this.app.audio.play( "success" );
    
    this.hud.golden_ninjas.gotoAndPlay( "OUT" );
    
    // set state
    this.state = this.STATE.CHEN_DEAD;
}
// </editor-fold>

Level.prototype.gameComplete = function() // <editor-fold defaultstate="collapsed">
{
    // hide dust
    this.dust.display.visible = false;
    
    // setup players
    let player;
    
    // setup kai
    player = this.players[0];
    player.localPos.set( 0, 0, 0 );
    player.setState( this.player.STATES.CHEER );
    
    // setup cole
    player = this.players[1];
    player.localPos.set( 0.15, 0, -0.2 );
    player.setState( this.player.STATES.CHEER );
    
    // setup zane
    player = this.players[2];
    player.localPos.set( -0.15, 0, -0.2 );
    player.setState( this.player.STATES.CHEER );
    
    // camera
    this.app.camera.position.x = 0;
    
    let timeline = gsap.timeline( { paused: true } );
    timeline.set( this.app.camera.camera.position, { x: 0, y: 0.7, z: -4 }, 0 );
    timeline.set( this.app.camera.camera.euler, { x: 0.2, y: Math.PI, z: 0 }, 0 );
    timeline.to( this.app.camera.camera.position, 4, { ease: Sine.easeInOut, y: -0.2, z: -2.4 }, 0 );
    timeline.to( this.app.camera.camera.euler, 4, { ease: Sine.easeInOut, x: 0 }, 0 );
    
    timeline.to( this.app.camera.camera.position, 4, { ease: Sine.easeInOut, x: 0.2 }, 2 );
    timeline.to( this.app.camera.camera.euler, 4, { ease: Sine.easeInOut, y: 2.9 }, 2 );
    
    timeline.play();
    
    // hud
    this.hud.showGameComplete();
    
    // set state
    this.state = this.STATE.GAME_COMPLETE;
}
// </editor-fold>

Level.prototype.showOutro = function() // <editor-fold defaultstate="collapsed">
{
    this.hud.showOutro();
    this.state = this.STATE.OUTRO;
}
// </editor-fold>

Level.prototype.onResize = function() // <editor-fold defaultstate="collapsed">
{
    this.app.camera.updatePerspective();
    
    if ( this.hud ) this.hud.onResize();
    
    if ( this.jsonData.debugCamera ) this.debugCamera.setPerspective( this.FOV, this.app.aspectRatio, 0.1, 4000 );
    
    if ( this.debugStartPanel ) this.debugStartPanel.style.left = ( this.app.stageW * 0.5 ) + "px";
}
// </editor-fold>

Level.prototype.destroy = function() // <editor-fold defaultstate="collapsed">
{
    console.log( "Level.destroy()" );
    
    // hud
    this.hud.fadeout();
    
    // music
    this.app.audio.setVolume( "level_music", 0, 1 );
    this.app.audio.setVolume( "atmo", 0, 1 );
    
    // fader
    setTimeout( this.destroyDelayed.bind( this ), 200 );
}
// </editor-fold>

Level.prototype.destroyDelayed = function() // <editor-fold defaultstate="collapsed">
{
    this.state = this.STATE.UNLOAD;
    this.app.state = this.app.STATE.DELETE_LEVEL;
    
    // canvas
    this.app.canvas.style.visibility = "hidden";
    
    // player
    if ( this.levelId < 3 )
    {
        this.player.destroy();
    }
    else
    {
        this.players[0].destroy();
        this.players[1].destroy();
        this.players[2].destroy();
        this.chen.destroy();
    }
    
    // hud
    this.hud.destroy();
   
    // levelparser
    this.levelparser.destroy();
    
    // scene
    AppUtils.destroyScene( this.app.scene );
    
    // delete physics
    this.app.physics.removeAllBodies();
    
    // delete ECS
    ECS.destroy();
    
    // delete this.props
    for( let p in this )
    {
        if ( p !== "destroyDelayed" && p !== "levelId" )
        {
            this[ p ] = undefined;
        }
    }
    
    // done
    setTimeout( App.levelUnloadComplete.bind( App ), 1000, this.levelId );
}
// </editor-fold>













/*
Level.prototype.updateRaycast = function()
{
    this.raycaster.setFromCamera( this.input.cameraSpacePos, this.app.camera );
    this.raycastResult = this.raycaster.intersectObject( this.raycastSphere );
    if ( this.raycastResult.length > 0 )
    {
        this.shootDirection = this.raycastResult[0].point;
    }
}
*/