'use strict';



const ECS = {};
ECS.id_count = 0;
ECS.entities = [];
ECS.updates = [];
ECS.activeUpdates = [];

ECS.TYPE = 
{
    STATIC:             0,
    DISPLAY:            1,
    SENSOR:             2,
    DEATH_ZONE:         3,
    
    OBSTACLE:           10,
    STONE:              11,
    CACTUS:             12,
    ICE_TOOTH:          13,
    BOXES:              14,

    STANDARD_BRICK:     20,
    MAGNET_BRICK:       21,
    HOURGLASS:          22,
    GOLDEN_BRICK:       23,
    VEHICLE_BRICK:      24,
    
    SHOT:               30,
    ENEMY_SHOT:         31,
    CHEN:               32,
    STAFF_SHOT:         33
};

ECS.debugCubeGeo = new zen3d.CubeGeometry( 1, 1, 1, 1, 1, 1 );


ECS.destroy = function()
{
    let i = 0;
    
    for ( i = 0; i < ECS.updates.length; i++ )
    {
        ECS.updates[i] = undefined;
    }
    
    ECS.updates = [];
    
    for ( i = 0; i < ECS.activeUpdates.length; i++ )
    {
        ECS.activeUpdates[i] = undefined;
    }
    
    ECS.activeUpdates = [];
    
    for ( i = 0; i < ECS.entities.length; i++ )
    {
        ECS.entities[i] = undefined;
    }
    
    ECS.entities = [];
}






ECS.MapItem = function( obj )
{
    // id    
    this.id = ECS.id_count;
    ECS.id_count++;
    
    // basic props    
    this.enabled = false;
    this.debug = false;
    this.type = "";
    
    // scene root
    this.sceneRoot = App.scene;    
    if ( obj ) this.sceneRoot = AppUtils.getSceneRoot( obj );
   
    ECS.entities.push( this );
}

ECS.Static = function( obj, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super    
    ECS.MapItem.call( this, obj );
    this.enabled = true;
    this.debug = debug;
    this.display = obj;
    this.type = ECS.TYPE.STATIC;

    // create collider 
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.entity = this;

    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
}

ECS.Static.prototype = Object.create( ECS.MapItem.prototype );
ECS.Static.prototype.constructor = ECS.Static;
// </editor-fold>

ECS.DeathZone = function( obj, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this, obj );
    this.enabled = true;
    this.debug = debug;
    this.type = ECS.TYPE.DEATH_ZONE;
    this.collisionResponse = "stick";

    // create collider 
    this.body = ECS.createCollider( [ obj ], this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_SENSOR;
    this.body.collisionFilterMask = App.physics.CMASK_SENSOR;
    this.body.collisionResponse = false;
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
}

ECS.DeathZone.prototype = Object.create( ECS.MapItem.prototype );
ECS.DeathZone.prototype.constructor = ECS.DeathZone;

// </editor-fold>

ECS.Obstacle = function( obj, type = ECS.TYPE.OBSTACLE, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this, obj );
    this.enabled = true;
    this.debug = debug;
    this.type = type;
    this.display = obj;
    
    // create collider
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    //if ( colliders.length === 0 ) return;
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
}

ECS.Obstacle.prototype = Object.create( ECS.MapItem.prototype );
ECS.Obstacle.prototype.constructor = ECS.Obstacle;

ECS.Obstacle.prototype.onCollision = function( event )
{
    //this.enabled = false;
}
// </editor-fold>

ECS.StandardBrick = function( obj ) // <editor-fold defaultstate="collapsed">
{
    // super    
    ECS.MapItem.call( this, obj );    
    this.enabled = true;
    this.debug = false;
    this.type = ECS.TYPE.STANDARD_BRICK;
    
    // special prop for magnet
    this.attractCount = -1;
    
    // mesh
    this.display = AppUtils.getAllObjects( obj.children, "m6141", "mesh" )[0];
    this.display.euler.set( 0.5, Math.random() * 3.1415, 1 );
    
    // create sensor
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.collisionResponse = false;
    this.body.updateMassProperties();
    this.body.entity = this;
    
    // hud
    this.scoreTarget = App.level.hud.scoreTarget;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.StandardBrick.prototype = Object.create( ECS.MapItem.prototype );
ECS.StandardBrick.prototype.constructor = ECS.StandardBrick;

ECS.StandardBrick.prototype.onUpdate = function( deltaTime )
{
    this.display.euler.y += deltaTime * 5;

    if ( this.attractCount > -1 )
    {
        this.attractCount += deltaTime;
        
        this.body.position.x += ( App.level.player.body.position.x - this.body.position.x ) * this.attractCount;
        this.body.position.y += ( App.level.player.body.position.y + 0.4 - this.body.position.y ) * this.attractCount;
        this.body.position.z += ( App.level.player.body.position.z - this.body.position.z ) * this.attractCount;
        this.display.position.x = this.body.position.x;
        this.display.position.y = this.body.position.y;
        this.display.position.z = this.body.position.z;
        
        if ( this.attractCount > 1 ) this.onCollision();
    }
}

ECS.StandardBrick.prototype.onCollision = function()
{    
    this.enabled = false;
    
    ECS.transformToNewParent( this.display, App.camera.camera );

    gsap.to( this.display.position, 0.2, { ease: Quad.easeOut, x: this.scoreTarget.x, y: this.scoreTarget.y, z: this.scoreTarget.z, onComplete: this.disable.bind( this ) } );
    gsap.to( this.display.scale, 0.2, { ease: Quad.easeOut, x: 0.05, y: 0.05, z: 0.05 } );
}

ECS.StandardBrick.prototype.attract = function()
{
    this.attractCount = 0;
    ECS.transformToNewParent( this.display, App.scene );
}

/*
ECS.StandardBrick.prototype.attract = function()
{
    this.enabled = false;
    let pos = App.level.halfForward;
    gsap.to( this.display.position, 0.5, { ease: Quad.easeIn, x: pos.x, y: pos.y, z: pos.z, onComplete: this.onCollision.bind( this ) } );
}
*/

ECS.StandardBrick.prototype.disable = function()
{
    this.display.visible = false;
}

// </editor-fold>

ECS.Hourglass = function( obj, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this, obj );
    this.enabled = true;
    this.debug = debug;
    this.type = ECS.TYPE.HOURGLASS;
    
    // mesh
    this.display = obj.children[0];
    this.display.euler.z = 0.5;
    
    // create sensor
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.collisionResponse = false;
    this.body.updateMassProperties();
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
    
    // create fx    
    this.fx = new ParticleSystem
    ({
        num:                4,
        root:               App.scene,
        origin:             new zen3d.Vector3( 0, 0, -0.1 ),
        gravity:            new zen3d.Vector3( 0, 0, 0 ),
        emitterSize:        new zen3d.Vector3( 0, 0, 0 ),

        velocityRange:      { min: new zen3d.Vector3( 0, 0, 0 ), max: new zen3d.Vector3( 0, 0, 0 ) },
        scaleRange:         { min: 1, max: 1 },
        lifetimeRange:      { min: 1, max: 1 },
        timeOffsetRange:    { min: 0.25, max: 0.25 },
        alphaRange:         { min: 1, max: 1 },
        fadein:             0.5,
        fadeout:            0.2,
        scaleOverTime:      -1,
        rotateOverTime:     0,
        loop:               0,
        
        img:                App.baseUrl + "/fx/lensflare.png",
        blending:           zen3d.BLEND_TYPE.ADD
    });
    this.display.add( this.fx.display );
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.Hourglass.prototype = Object.create( ECS.MapItem.prototype );
ECS.Hourglass.prototype.constructor = ECS.Hourglass;

ECS.Hourglass.prototype.onUpdate = function( deltaTime )
{
    this.display.euler.y += deltaTime * 5;
    this.fx.onUpdate( deltaTime );
}

ECS.Hourglass.prototype.onCollision = function( event )
{    
    this.enabled = false;
    this.display.visible = false;    
    App.level.slowmo.start();
}

// </editor-fold>

ECS.MagnetBrick = function( obj, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this, obj );
    this.enabled = true;
    this.debug = debug;
    this.type = ECS.TYPE.MAGNET_BRICK;
    
    // mesh
    this.display = obj.children[0];
    
    // create sensor
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.collisionResponse = false;
    this.body.updateMassProperties();
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
    
    // create fx    
    this.fx = new ParticleSystem
    ({
        num:                4,
        root:               App.scene,
        origin:             new zen3d.Vector3( 0, 0, -0.1 ),
        gravity:            new zen3d.Vector3( 0, 0, 0 ),
        emitterSize:        new zen3d.Vector3( 0, 0, 0 ),

        velocityRange:      { min: new zen3d.Vector3( 0, 0, 0 ), max: new zen3d.Vector3( 0, 0, 0 ) },
        scaleRange:         { min: 1, max: 1 },
        lifetimeRange:      { min: 1, max: 1 },
        timeOffsetRange:    { min: 0.25, max: 0.25 },
        alphaRange:         { min: 1, max: 1 },
        fadein:             0.5,
        fadeout:            0.2,
        scaleOverTime:      -1,
        rotateOverTime:     0,
        loop:               0,
        
        img:                App.baseUrl + "/fx/lensflare.png",
        blending:           zen3d.BLEND_TYPE.ADD
    });
    
    this.display.add( this.fx.display );
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.MagnetBrick.prototype = Object.create( ECS.MapItem.prototype );
ECS.MagnetBrick.prototype.constructor = ECS.MagnetBrick;

ECS.MagnetBrick.prototype.onUpdate = function( deltaTime )
{
    this.display.euler.z += deltaTime * 5;
    this.fx.onUpdate( deltaTime );
}

ECS.MagnetBrick.prototype.onCollision = function( event )
{    
    this.enabled = false;
    this.display.visible = false;
}

// </editor-fold>

ECS.GoldenBrick = function( obj, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this, obj );
    this.enabled = true;
    this.debug = debug;
    this.type = ECS.TYPE.GOLDEN_BRICK;
    
    // mesh
    this.display = obj.children[0];
    this.display.euler.x = -0.5;
    
    // create sensor
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.collisionResponse = false;
    this.body.updateMassProperties();
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
    
    // create fx    
    this.fx = new ParticleSystem
    ({
        num:                4,
        root:               App.scene,
        origin:             new zen3d.Vector3( 0, 0, -0.1 ),
        gravity:            new zen3d.Vector3( 0, 0, 0 ),
        emitterSize:        new zen3d.Vector3( 0, 0, 0 ),

        velocityRange:      { min: new zen3d.Vector3( 0, 0, 0 ), max: new zen3d.Vector3( 0, 0, 0 ) },
        scaleRange:         { min: 0.3, max: 0.5 },
        lifetimeRange:      { min: 1, max: 1 },
        timeOffsetRange:    { min: 0.25, max: 0.25 },
        alphaRange:         { min: 1, max: 1 },
        fadein:             0.2,
        fadeout:            0.2,
        scaleOverTime:      2,
        rotateOverTime:     0,
        loop:               0,
        
        img:                App.baseUrl + "/fx/lensflare.png",
        blending:           zen3d.BLEND_TYPE.ADD
    });
    this.display.add( this.fx.display );
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.GoldenBrick.prototype = Object.create( ECS.MapItem.prototype );
ECS.GoldenBrick.prototype.constructor = ECS.GoldenBrick;

ECS.GoldenBrick.prototype.onUpdate = function( deltaTime )
{
    this.display.euler.y += deltaTime * 5;
    this.fx.onUpdate( deltaTime );
}

ECS.GoldenBrick.prototype.onCollision = function( event )
{    
    this.enabled = false;
    this.display.visible = false;
}

ECS.GoldenBrick.prototype.hide = function()
{
    this.display.visible = false;
}
// </editor-fold>

ECS.VehicleBrick = function( obj, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this, obj );
    this.enabled = true;
    this.debug = debug;
    this.type = ECS.TYPE.VEHICLE_BRICK;
    
    // mesh
    this.display = obj.children[0];
    this.display.euler.x = -0.5;
    
    // create sensor
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.collisionResponse = false;
    this.body.updateMassProperties();
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
    
    // create fx    
    this.fx = new ParticleSystem
    ({
        num:                4,
        root:               App.scene,
        origin:             new zen3d.Vector3( 0, 0, -0.1 ),
        gravity:            new zen3d.Vector3( 0, 0, 0 ),
        emitterSize:        new zen3d.Vector3( 0, 0, 0 ),

        velocityRange:      { min: new zen3d.Vector3( 0, 0, 0 ), max: new zen3d.Vector3( 0, 0, 0 ) },
        scaleRange:         { min: 0.3, max: 0.5 },
        lifetimeRange:      { min: 1, max: 1 },
        timeOffsetRange:    { min: 0.25, max: 0.25 },
        alphaRange:         { min: 1, max: 1 },
        fadein:             0.2,
        fadeout:            0.2,
        scaleOverTime:      2,
        rotateOverTime:     0,
        loop:               0,
        
        img:                App.baseUrl + "/fx/lensflare.png",
        blending:           zen3d.BLEND_TYPE.ADD
    });
    this.display.add( this.fx.display );
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.VehicleBrick.prototype = Object.create( ECS.MapItem.prototype );
ECS.VehicleBrick.prototype.constructor = ECS.VehicleBrick;

ECS.VehicleBrick.prototype.onUpdate = function( deltaTime )
{
    this.display.euler.y += deltaTime * 5;
    this.fx.onUpdate( deltaTime );
}

ECS.VehicleBrick.prototype.onCollision = function( event )
{    
    this.enabled = false;
    this.display.visible = false;
}

ECS.VehicleBrick.prototype.hide = function()
{
    this.display.visible = false;
}
// </editor-fold>

ECS.Sensor = function( obj, callbacks, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super    
    ECS.MapItem.call( this, obj );
    this.enabled = true;
    this.debug = debug;
    this.callbacks = callbacks;
    this.type = ECS.TYPE.SENSOR;
    
    // create collider
    let sensorMesh = AppUtils.getAllObjects( obj.children, "SENSOR", "" );

    this.body = ECS.createCollider( sensorMesh, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_SENSOR;
    this.body.collisionFilterMask = App.physics.CMASK_SENSOR;
    this.body.collisionResponse = false;
    this.body.updateMassProperties();
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
}

ECS.Sensor.prototype = Object.create( ECS.MapItem.prototype );
ECS.Sensor.prototype.constructor = ECS.Sensor;

ECS.Sensor.prototype.onCollision = function()
{
    this.enabled = false;

    for( let i = 0; i < this.callbacks.length; i++ )
    {
        this.callbacks[i]();
    }
}

// </editor-fold>

ECS.Shot = function( display, halfExtent, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super    
    ECS.MapItem.call( this );
    this.enabled = false;
    this.debug = debug;
    this.type = ECS.TYPE.SHOT;
    
    // body
    this.body = new CANNON.Body();
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_SHOT;
    this.body.collisionFilterMask = App.physics.CMASK_SHOT;    
    this.body.addShape( new CANNON.Box( halfExtent ) );
    this.body.mass = 0;
    this.body.updateMassProperties();
    this.body.addEventListener( "collide", App.level.onShotCollision.bind( App.level ) );
    this.body.entity = this;
    
    // display
    this.display = display;
    
    // add to world
    App.physics.world.add( this.body );
    App.scene.add( this.display );
    
    // updates
    ECS.updates.push ( this );
}

ECS.Shot.prototype = Object.create( ECS.MapItem.prototype );
ECS.Shot.prototype.constructor = ECS.Shot;

ECS.Shot.prototype.start = function( origin, worldDirection )
{
    this.enabled = true;
    
    this.display.visible = true;
    this.display.position.copy( origin );
    
    this.display.lookAt( origin.add( worldDirection ), App.level.up );
    
    this.body.position.copy( this.display.position );
    this.body.quaternion.copy( this.display.quaternion );
    
    this.speed = worldDirection;
    
    //this.body.velocity.set( worldDirection.x, worldDirection.y, worldDirection.z );
}

ECS.Shot.prototype.onUpdate = function( deltaTime )
{
    this.body.position.x += this.speed.x * deltaTime;
    this.body.position.y += this.speed.y * deltaTime;
    this.body.position.z += this.speed.z * deltaTime;
    
    this.display.position.copy( this.body.position );
}

ECS.Shot.prototype.disable = function()
{
    this.enabled = false;
    this.body.velocity.set( 0, 0, 0 );
    this.body.position.set( 0, 10, 0 );
    this.display.visible = false;
}
// </editor-fold>

ECS.EnemyShot = function( display, halfExtent, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super    
    ECS.MapItem.call( this );
    this.enabled = false;
    this.debug = debug;
    this.type = ECS.TYPE.ENEMY_SHOT;
    
    // body
    this.body = new CANNON.Body();
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;    
    this.body.addShape( new CANNON.Box( halfExtent ) );
    this.body.mass = 0;
    this.body.updateMassProperties();
    this.body.entity = this;
    
    // display
    this.display = display;
    this.display.visible = false;
    
    // add to world
    App.physics.world.add( this.body );
    App.scene.add( this.display );
    
    // updates
    ECS.updates.push ( this );
}

ECS.EnemyShot.prototype = Object.create( ECS.MapItem.prototype );
ECS.EnemyShot.prototype.constructor = ECS.EnemyShot;

ECS.EnemyShot.prototype.start = function( origin, worldDirection )
{
    this.enabled = true;
    this.display.visible = true;
    
    this.display.visible = true;
    this.display.position.copy( origin );
    
    this.display.lookAt( origin.add( worldDirection ), App.level.up );
    
    this.body.position.copy( this.display.position );
    this.body.quaternion.copy( this.display.quaternion );
    
    this.speed = worldDirection;
}

ECS.EnemyShot.prototype.onUpdate = function( deltaTime )
{
    this.body.position.x += this.speed.x * deltaTime;
    this.body.position.y += this.speed.y * deltaTime;
    this.body.position.z += this.speed.z * deltaTime;
    
    this.display.position.copy( this.body.position );
}

ECS.EnemyShot.prototype.disable = function()
{
    this.enabled = false;
    this.display.visible = false;
    this.body.velocity.set( 0, 0, 0 );
    this.body.position.set( 0, 10, 0 );
}
// </editor-fold>

ECS.Animation = function( obj, animation, autoplay = false ) // <editor-fold defaultstate="collapsed">
{    
    // super    
    ECS.MapItem.call( this, obj );    
    this.enabled = autoplay;
    this.debug = false;
    
    // create animation  
    this.animation = new zen3d.AnimationMixer();
    this.animation.add( animation );
    
    // autoplay
    if ( autoplay ) this.onStart();
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.Animation.prototype = Object.create( ECS.MapItem.prototype );
ECS.Animation.prototype.constructor = ECS.Animation;

ECS.Animation.prototype.reset = function()
{
    this.animation.play( "anim" );
    this.animation.fastUpdate( 0 );
}

ECS.Animation.prototype.onStart = function()
{
    this.enabled = true;
    this.animation.play( "anim" );
}

ECS.Animation.prototype.onUpdate = function( deltaTime )
{
    this.animation.fastUpdate( deltaTime );
}
// </editor-fold>

ECS.Firepit = function( obj, debug = false ) // <editor-fold defaultstate="collapsed">
{    
    // super    
    ECS.MapItem.call( this, obj );
    this.enabled = true;
    this.type = ECS.TYPE.OBSTACLE;
    this.debug = debug;
    
    // display
    this.display = obj;
    this.flame = this.display.getObjectByName( "Firepit_Flame" );
    this.sinCount = Math.random();
    this.sinScale = 10 + Math.random() * 3;

    // create fx    
    this.fx = new ParticleSystem
    ({
        num:                20,
        root:               App.scene,
        origin:             new zen3d.Vector3( 0, 0.5, -0.1 ),
        gravity:            new zen3d.Vector3( 0, 0.3, 0 ),
        emitterSize:        new zen3d.Vector3( 0.1, 0.1, 0.1 ),

        velocityRange:      { min: new zen3d.Vector3( -0.05, -0.05, -0.05 ), max: new zen3d.Vector3( 0.05, 0.05, 0.05 ) },
        scaleRange:         { min: 0.1, max: 0.2 },
        lifetimeRange:      { min: 1, max: 2 },
        timeOffsetRange:    { min: 0.05, max: 0.05 },
        alphaRange:         { min: 0.8, max: 1 },
        fadein:             0.1,
        fadeout:            0.5,
        scaleOverTime:      1.2,
        rotateOverTime:     0,
        loop:               0,
        
        img:                App.baseUrl + "/fx/dust.png",
        blending:           zen3d.BLEND_TYPE.ADD
    });
    this.display.add( this.fx.display );
    
    // create fx    
    this.fx2 = new zen3d.Mesh( new QuadGeometry(), new UnlitMaterial( "flame", App.baseUrl + "/fx/fire.png", 0.0005 ) );
    this.fx2.material.transparent = true;
    this.fx2.material.depthTest = true;
    this.fx2.material.depthWrite = false;
    this.fx2.blending = zen3d.BLEND_TYPE.ADD;
    this.fx2.euler.x = - Math.PI * 0.5;
    this.fx2.position.set( 0, 0.3, -0.05 );
    this.fx2.scale.set( 0.7, 0.7, 0.7 );
    this.flame.add( this.fx2 );

    // create collider
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.Firepit.prototype = Object.create( ECS.MapItem.prototype );
ECS.Firepit.prototype.constructor = ECS.Firepit;

ECS.Firepit.prototype.onUpdate = function( deltaTime )
{
    this.sinCount += deltaTime * this.sinScale;
    this.sinCount2 = this.sinCount * 0.5;
    this.flame.scale.y = 0.95 + Math.sin( this.sinCount ) * 0.1;
    this.flame.euler.x = Math.sin( this.sinCount2 ) * 0.2;
    this.flame.euler.y = Math.sin( this.sinCount2 ) * 0.5;
    this.fx.onUpdate( deltaTime );
}
// </editor-fold>

ECS.Magnet = function( debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this );    
    this.enabled = false;
    this.debug = debug;
    
    // create collider   
    this.body = new CANNON.Body();
    this.body.addShape( new CANNON.Sphere( 2 ), new CANNON.Vec3( 0, 0, 1 ) );
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.mass = 0;
    this.body.collisionFilterGroup = App.physics.CGROUP_PLAYER;
    this.body.collisionFilterMask = App.physics.CMASK_PLAYER;
    this.body.collisionResponse = false;
    this.body.updateMassProperties();

    // direct add
    App.physics.world.addBody( this.body );
    
    // collision listener
    this.body.addEventListener( "collide", this.onCollision.bind( this ) );
    
    // debug
    if( this.debug )
    {
        let mat = new zen3d.BasicMaterial();
        mat.transparent = true;
        mat.opacity = 0.3;
        
        this.body.debugMesh = new zen3d.Mesh( new zen3d.SphereGeometry( 1 ), mat );
        App.scene.add( this.body.debugMesh );
    }
    
    // create fx    
    this.fx = new ParticleSystem
    ({
        num:                4,
        root:               App.scene,
        origin:             new zen3d.Vector3( 0, 0, 0 ),
        gravity:            new zen3d.Vector3( 0, 0, 0 ),
        emitterSize:        new zen3d.Vector3( 0, 0, 0 ),

        velocityRange:      { min: new zen3d.Vector3( 0, 0, 0 ), max: new zen3d.Vector3( 0, 0, 0 ) },
        scaleRange:         { min: 1, max: 1 },
        lifetimeRange:      { min: 1, max: 1 },
        timeOffsetRange:    { min: 0.25, max: 0.25 },
        alphaRange:         { min: 1, max: 1 },
        fadein:             0.5,
        fadeout:            0.2,
        scaleOverTime:      -1,
        rotateOverTime:     0,
        loop:               0,
        
        img:                App.baseUrl + "/fx/lensflare.png",
        blending:           zen3d.BLEND_TYPE.ADD
    });
    
    this.display = this.fx.display;
    this.display.position.set( 0, 0.3, 0 );
    this.display.scale.set( 0, 0, 0 );
    App.level.player.display.add( this.display );
    
    // create beam    
    let mat = new UnlitMaterial( "Magnet Beam", App.baseUrl + "/fx/sparkle.png" );
    mat.transparent = true;
    mat.depthWrite = false;
    mat.depthTest = true;
    mat.blending = zen3d.BLEND_TYPE.ADD;

    let geo = new QuadGeometry( { x: 0, y: 0, z: 0.5 } );
    this.beam = new zen3d.Mesh( geo, mat );
    this.beam.position.set( 0, 0.5, 0 );
    this.beam.scale.set( 0.1, 0.1, 0.1 );
    App.scene.add( this.beam );
    
    this.beamTarget = null;
    this.beamTargetPosition = new zen3d.Vector3();
    this.beamTargetDistance = 0;
    
    // timer
    this.timer = 0;
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.Magnet.prototype = Object.create( ECS.MapItem.prototype );
ECS.Magnet.prototype.constructor = ECS.Magnet;

ECS.Magnet.prototype.start = function()
{
    this.timer = 7;
    gsap.to( this.display.scale, 0.3, { ease: Quad.easeOut, x: 1, y: 1, z: 1 } );
    this.enabled = true;
    
    App.level.deltaTimeScale = 0.05;
    App.level.hud.Icon_Magnet_Show();
    App.level.state = App.level.STATE.COLLECT_SPECIAL;
}

ECS.Magnet.prototype.onUpdate = function( deltaTime )
{    
    this.timer -= deltaTime;
    
    this.body.position.copy( App.level.halfForward );
    this.fx.onUpdate( deltaTime );
    
    if ( this.debug ) this.body.debugMesh.position.copy( this.body.position );
    
    // beam
    if ( this.beamTarget )
    {
        this.beam.position.copy( App.level.player.display.position );
        this.beam.position.y = 0.5;
        this.beamTargetPosition.setPositionFromMatrix( this.beamTarget.worldMatrix );
        this.beamTargetDistance = this.beam.position.distanceTo( this.beamTargetPosition );
        this.beam.lookAt( this.beamTargetPosition, new zen3d.Vector3( 0, 1, 0 ) );
        this.beam.scale.set( 0.1, 1, this.beamTargetDistance );
        
        this.beam.visible = ( this.beamTargetDistance > 0.2 );
    }
    
    // hud
    App.level.hud.Icon_Magnet_Update( this.timer );
    
    // countdown
    if ( this.timer < 0 ) this.stop();
}

ECS.Magnet.prototype.stop = function()
{
    gsap.to( this.display.scale, 0.3, { ease: Quad.easeIn, x: 0, y: 0, z: 0 } );
    this.beam.visible = false;
    this.enabled = false;
    
    App.level.hud.Icon_Magnet_Hide();
}

ECS.Magnet.prototype.onCollision = function( event )
{    
    if ( event.contact.bj.entity )
    {
        if ( event.contact.bj.entity.type === ECS.TYPE.STANDARD_BRICK )
        {
            event.contact.bj.entity.attract();
            this.beamTarget = event.contact.bj.entity.display;
        }
    }
}


// </editor-fold>

ECS.Waterfall = function( obj, scale ) // <editor-fold defaultstate="collapsed">
{    
    // super    
    ECS.MapItem.call( this, obj );    
    this.enabled = true;
    
    // get material
    let display = AppUtils.getAllObjects( obj, "Water", "mesh" )[0];
    this.textures = [ display.material.diffuseMap, display.material.normalMap, display.material.aoMap ];
    
    // create fx    
    this.fx = new ParticleSystem
    ({
        num:                20,
        root:               App.scene,
        origin:             new zen3d.Vector3( 0, 0, 0 ),
        gravity:            new zen3d.Vector3( 0, 0, 0 ),
        emitterSize:        new zen3d.Vector3( 0.5, 0.1, 0.5 ),

        velocityRange:      { min: new zen3d.Vector3( -0.05, 0.5, -0.05 ), max: new zen3d.Vector3( 0.05, 0.6, 0.05 ) },
        scaleRange:         { min: 0.5, max: 0.7 },
        lifetimeRange:      { min: 1, max: 2 },
        timeOffsetRange:    { min: 0.05, max: 0.05 },
        alphaRange:         { min: 0.8, max: 1 },
        fadein:             0.1,
        fadeout:            0.5,
        scaleOverTime:      1,
        rotateOverTime:     0,
        loop:               0,
        
        img:                App.baseUrl + "/waterfall_foam.png",
        blending:           zen3d.BLEND_TYPE.ADD
    });
    this.fx.display.position.set( 0, -5.5, -1.8 ).applyMatrix4( display.worldMatrix );
    App.scene.add( this.fx.display );
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.Waterfall.prototype = Object.create( ECS.MapItem.prototype );
ECS.Waterfall.prototype.constructor = ECS.Waterfall;

ECS.Waterfall.prototype.onUpdate = function( deltaTime )
{    
    let i = 0;
    
    for ( i; i < 3; i++ )
    {
        this.textures[i].offset.y -= deltaTime * 0.7;
    }
    
    this.fx.onUpdate( deltaTime );
}
// </editor-fold>

ECS.Slowmo = function( debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this );    
    this.enabled = false;
    this.debug = debug;
    
    // create fx    
    this.fx = new ParticleSystem
    ({
        num:                4,
        root:               App.scene,
        origin:             new zen3d.Vector3( 0, 0, 0 ),
        gravity:            new zen3d.Vector3( 0, 0, 0 ),
        emitterSize:        new zen3d.Vector3( 0, 0, 0 ),

        velocityRange:      { min: new zen3d.Vector3( 0, 0, 0 ), max: new zen3d.Vector3( 0, 0, 0 ) },
        scaleRange:         { min: 1, max: 1 },
        lifetimeRange:      { min: 1, max: 1 },
        timeOffsetRange:    { min: 0.25, max: 0.25 },
        alphaRange:         { min: 1, max: 1 },
        fadein:             0.5,
        fadeout:            0.2,
        scaleOverTime:      -1,
        rotateOverTime:     0,
        loop:               0,
        
        img:                App.baseUrl + "/fx/lensflare.png",
        blending:           zen3d.BLEND_TYPE.ADD
    });
    
    this.display = this.fx.display;
    this.display.position.set( 0, 0.3, 0 );
    this.display.scale.set( 0, 0, 0 );
    App.level.player.display.add( this.display );
    
    // timer
    
    this.timer = 0;
    this.timeScale = 1;
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.Slowmo.prototype = Object.create( ECS.MapItem.prototype );
ECS.Slowmo.prototype.constructor = ECS.Slowmo;

ECS.Slowmo.prototype.start = function()
{
    this.timeScale = 0.6;
    this.timer = 7;
    gsap.to( this.display.scale, 0.3, { ease: Quad.easeOut, x: 1, y: 1, z: 1 } );
    this.enabled = true;
    
    App.level.deltaTimeScale = 0.1;
    App.level.hud.Icon_Hourglass_Show();
    App.level.state = App.level.STATE.COLLECT_SPECIAL;
}

ECS.Slowmo.prototype.onUpdate = function( deltaTime )
{
    this.timer -= deltaTime;
    this.fx.onUpdate( deltaTime );
    
    App.level.hud.Icon_Hourglass_Update( this.timer );
    
    // countdown
    if ( this.timer < 0 ) this.stop();
}

ECS.Slowmo.prototype.stop = function()
{
    this.timeScale = 1;
    gsap.to( this.display.scale, 0.3, { ease: Quad.easeIn, x: 0, y: 0, z: 0 } );
    this.enabled = false;
    
    App.level.hud.Icon_Hourglass_Hide();
}

// </editor-fold>

ECS.Snake = function( obj, asset, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this, obj );
    this.enabled = false;
    this.debug = debug;
    this.type = ECS.TYPE.OBSTACLE;
    
    // create collider
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    if ( colliders.length === 0 ) return;
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
    
    // display
    this.display = obj;
    this.display.globalToLocal = new zen3d.Matrix4().copy( this.display.parent.worldMatrix ).inverse();
    this.asset = asset;
    obj.add( this.asset.display );
    this.asset.gotoAndPlay( "ATTACK", 1 );
    this.asset.onUpdate( 0 );
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.Snake.prototype = Object.create( ECS.MapItem.prototype );
ECS.Snake.prototype.constructor = ECS.Snake;

ECS.Snake.prototype.reset = function()
{
    this.asset.gotoAndPlay( "ATTACK", 1 );
    this.asset.onUpdate( 0 );
}

ECS.Snake.prototype.onStart = function()
{
    this.enabled = true;
    this.asset.gotoAndPlay( "IDLE" );
    gsap.to( this.body.position, 2, { ease: Linear.easeNone, x: App.level.player.worldPos.x, z: App.level.player.worldPos.z } );
}

ECS.Snake.prototype.onUpdate = function( deltaTime )
{
    this.display.position.copy( this.body.position ).applyMatrix4( this.display.globalToLocal );    
    if ( this.debug ) this.body.debugMesh.position.copy( this.body.position );
    this.asset.onUpdate( deltaTime );
}

ECS.Snake.prototype.onCollision = function()
{
    this.asset.gotoAndPlay( "ATTACK" );
    gsap.killTweensOf( this.body.position );
    
    console.log( "Snake.onCollision")
}
// </editor-fold>

ECS.StoneWarrior = function( obj, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this, obj );
    this.enabled = false;
    this.debug = debug;
    this.type = ECS.TYPE.OBSTACLE;
    
    // create collider
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
    
    // asset & display
    let origin = AppUtils.getAllObjects( obj.children, "Stone_Warrior_Sword", "mesh" )[0];
    
    this.asset = App.level.levelparser.assetLoader.instantiate( "STONE_WARRIOR" );
    this.display = this.asset.display;
    this.display.getObjectByName( "crossbow" ).visible = false;
    this.display.globalToLocal = new zen3d.Matrix4().copy( origin.parent.worldMatrix ).inverse();
    this.display.position.copy( origin.position );
    this.display.quaternion.copy( origin.quaternion );
    this.display.scale.copy( origin.scale );
    origin.parent.add( this.display ); 
    origin.parent.remove( origin );

    this.asset.gotoAndPlay( "IDLE_1", 0 );
    this.asset.onUpdate( 0 );
    this.state = "IDLE";
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.StoneWarrior.prototype = Object.create( ECS.MapItem.prototype );
ECS.StoneWarrior.prototype.constructor = ECS.StoneWarrior;

ECS.StoneWarrior.prototype.reset = function()
{
    this.state = "IDLE";
    this.asset.gotoAndPlay( "IDLE_1", 0 );
    this.asset.onUpdate( 0 );
}

ECS.StoneWarrior.prototype.onStart = function()
{
    this.enabled = true;
    this.asset.gotoAndPlay( "RUN" );
    this.state = "RUN";
}

ECS.StoneWarrior.prototype.onUpdate = function( deltaTime )
{
    // animation
    this.asset.onUpdate( deltaTime );
    
    // is it done?
    if ( this.state === "DONE" ) return;
    
    // logic
    let target = new zen3d.Vector3().copy( App.level.player.worldPos ).sub( this.body.position );
    let distance = target.getLength();
    
    if ( distance < 1 )
    {
        this.state = "DONE";
    }
    else if ( distance < 2 )
    {
        this.asset.gotoAndPlay( "ATTACK_SWORD" );
    }
    
    // move body
    distance = 1 / distance;
    target.x *= distance;
    target.y *= distance;
    target.z *= distance;
    
    this.body.position.x += target.x * deltaTime * 4;
    this.body.position.y += target.y * deltaTime * 4;
    this.body.position.z += target.z * deltaTime * 4;
    
    // copy position to display
    target.copy( this.body.position ).applyMatrix4( this.display.globalToLocal );
    this.display.position.copy( target );
    
    // debug
    if ( this.debug ) this.body.debugMesh.position.copy( this.body.position );
}

ECS.StoneWarrior.prototype.onCollision = function()
{
    this.asset.gotoAndPlay( "ATTACK_SWORD" );
    gsap.killTweensOf( this.body.position );
}
// </editor-fold>

ECS.Enemy_Hypnobrai = function( obj, debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super
    ECS.MapItem.call( this, obj );
    this.enabled = false;
    this.debug = debug;
    this.type = ECS.TYPE.OBSTACLE;
    
    // create collider
    let colliders = AppUtils.getAllObjects( obj.children, "COLLIDER", "mesh" );
    this.body = ECS.createCollider( colliders, this.debug );
    this.body.type = CANNON.Body.STATIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;
    this.body.entity = this;
    
    // debug
    if ( this.debug ) App.scene.add( this.body.debugMesh );
    
    // asset & display
    
    this.asset = App.level.levelparser.assetLoader.instantiate( "MINIFIGURE" );
    this.display = this.asset.display;
    this.display.getObjectByName( "Ninja_Sword" ).visible = false;
    
    let origin = obj.getObjectByName( "Hypnobrai" );
    this.display.localToGlobal = new zen3d.Matrix4().copy( obj.worldMatrix );
    this.display.globalToLocal = new zen3d.Matrix4().copy( obj.worldMatrix ).inverse();
    let localMat = new zen3d.Matrix4().copy( origin.worldMatrix ).multiply( this.display.globalToLocal );
    this.display.position.setPositionFromMatrix( origin.worldMatrix ).applyMatrix4( this.display.globalToLocal );
    this.display.quaternion.setFromRotationMatrix( localMat );
    this.offsetPos = this.display.position.clone();
    obj.add( this.display );
    obj.remove( origin.parent );
    
    // arrow
    let arrowDisplay = this.display.getObjectByName( "arrow" );
    arrowDisplay.scale.set( 1.5, 1.5, 1.5 );
    this.arrow = new ECS.EnemyShot
    ( 
        arrowDisplay, 
        new CANNON.Vec3( 0.05, 0.05, 0.15 ),
        debug
    );

    this.state = "IDLE";
    this.stateCount = { "IDLE": 0, "STRAFE": 0, "PREPARE_ATTACK": 0, "SHOOT": 0 };
    
    // ECS.updates
    ECS.updates.push( this );
}

ECS.Enemy_Hypnobrai.prototype = Object.create( ECS.MapItem.prototype );
ECS.Enemy_Hypnobrai.prototype.constructor = ECS.Enemy_Hypnobrai;

ECS.Enemy_Hypnobrai.prototype.reset = function()
{
    this.state = "IDLE";
    this.asset.gotoAndPlay( "IDLE_1", 0 );
    this.asset.onUpdate( 0 );
}

ECS.Enemy_Hypnobrai.prototype.onStart = function()
{
    this.enabled = true;
    this
    
    if ( this.offsetPos.x > 0 )
    {
        this.asset.gotoAndPlay( "STRAFE_L" );
    }
    else if ( this.offsetPos.x < 0 )
    {
        this.asset.gotoAndPlay( "STRAFE_R" );
    }

    let zeroPos = new zen3d.Vector3( 0, this.display.position.y, this.display.position.z ).applyMatrix4( this.display.localToGlobal );
    gsap.to( this.body.position, 0.33, { ease: Linear.easeNone, x: zeroPos.x, y: zeroPos.y, z: zeroPos.z } );
    
    this.state = "STRAFE";
}

ECS.Enemy_Hypnobrai.prototype.onUpdate = function( deltaTime )
{
    // animation
    this.asset.onUpdate( deltaTime );
    
    // stateCount
    this.stateCount[ this.state ] += deltaTime;
    
    // state switch
    
    switch( this.state )
    {
        case "STRAFE":
            
            if ( this.stateCount[ this.state ] > 0.3 )
            {
                this.stateCount[ this.state ] = 0;
                this.asset.gotoAndPlay( "PREPARE_ATTACK" );
                this.state = "PREPARE_ATTACK";
            }
            
        break;
        
        case "PREPARE_ATTACK":
            
            if ( this.stateCount[ this.state ] > 0.5 )
            {
                this.stateCount[ this.state ] = 0;
                this.asset.gotoAndPlay( "SHOOT" );
                this.state = "SHOOT";
            }
            
        break;
        
        case "SHOOT":
           
            let origin = new zen3d.Vector3( this.body.position.x, this.body.position.y + 0.25, this.body.position.z );
            let worldDirection = new zen3d.Vector3().copy( App.level.player.body.position ).subtract( origin ).normalize().multiplyScalar( 2 );
            this.arrow.start( origin, worldDirection );
            this.state = "COOLDOWN";
            
        break;
        
        case "COOLDOWN":
            
        break;
    }

    // update display
    this.display.position.copy( this.body.position ).applyMatrix4( this.display.globalToLocal );

    // debug
    if ( this.debug ) this.body.debugMesh.position.copy( this.body.position );
}

ECS.Enemy_Hypnobrai.prototype.onCollision = function()
{
    this.asset.gotoAndPlay( "DIE_1" );
}
// </editor-fold>

ECS.StoneCollision = function( obj, animation ) // <editor-fold defaultstate="collapsed">
{    
    // super    
    ECS.MapItem.call( this, obj );    
    this.enabled = false;
    this.debug = false;
    
    // mesh    
    this.display = obj;
    
    // avoid camera hickups ?
    this.display.frustumCulled = false;
    this.display.autoUpdateMatrix = false;
    
    for( let i = 0; i < this.display.children; i++ )
    {
        this.display.children[i].frustumCulled = false;
        this.display.children[i].autoUpdateMatrix = false;
    }
    
    // create animation
    this.animation = new zen3d.AnimationMixer();
    this.animation.add( animation );
    
    // update
    ECS.updates.push( this );
}

ECS.StoneCollision.prototype = Object.create( ECS.MapItem.prototype );
ECS.StoneCollision.prototype.constructor = ECS.StoneCollision;

ECS.StoneCollision.prototype.start = function( worldPos, worldQuat, scale )
{
    this.enabled = true;
    this.display.visible = true;

    this.display.position = new zen3d.Vector3();
    AppUtils.convertPosition( worldPos, this.display.position );
    this.display.quaternion = new zen3d.Quaternion().copy( worldQuat );    
    if ( scale ) this.display.scale.copy( scale );

    this.animation.play( "anim", 0 );
}

ECS.StoneCollision.prototype.stop = function()
{
    this.enabled = false;
}

ECS.StoneCollision.prototype.onUpdate = function( deltaTime )
{
    this.animation.fastUpdate( deltaTime );
}
// </editor-fold>

ECS.StaffShot = function( debug = false ) // <editor-fold defaultstate="collapsed">
{
    // super    
    ECS.MapItem.call( this );
    this.enabled = false;
    this.debug = debug;
    this.type = ECS.TYPE.STAFF_SHOT;
    
    // body
    this.body = new CANNON.Body();
    this.body.type = CANNON.Body.DYNAMIC;
    this.body.collisionFilterGroup = App.physics.CGROUP_STATIC;
    this.body.collisionFilterMask = App.physics.CMASK_STATIC;    
    this.body.addShape( new CANNON.Sphere( 0.2 ), new CANNON.Vec3( 0, 0, 0 ) );
    this.body.mass = 0;
    this.body.updateMassProperties();
    this.body.position.y = 10;
    this.body.entity = this;
    
    // display
    this.particles = new AdvancedParticleSystem
    ({
        count: 10,
        repeat: 1000000,
        gravity: new zen3d.Vector3( 0, 0, 0 ),
        texUrl: App.level.jsonData.baseUrl + "fx/staff_shot.png",

        uvTransform:
        {
            offset: { x: 0, y: 0 },
            scale: { x: 1, y: 1 }
        },

        emitter:
        {
            size: new zen3d.Vector3( 0.01, 0.0, 0.01 )
        },

        lifetime:
        {
            min: 0.2,
            max: 0.4
        },

        offset:
        {
            min: 0.05,
            max: 0.1
        },

        velocity: 
        { 
            min: new zen3d.Vector3( 0, 0, 0 ),
            max: new zen3d.Vector3( 0, 0, 0 )
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
                min: 0.2,
                max: 0.4
            },
            death:
            {
                min: 1,
                max: 4
            }
        },
        colorOverLife:
        [
            { time: 0.0, color: new zen3d.Color3( "0xFFFFFF" ) },
            { time: 0.1, color: new zen3d.Color3( "0xFFFFFF" ) },
            { time: 0.15, color: new zen3d.Color3( "0xFFFFFF" ) },
            { time: 0.35, color: new zen3d.Color3( "0xFFFFFF" ) }
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
            min: 10,
            max: 30
        },
        wiggle:
        {
            amplitude: new zen3d.Vector3( 0, 0, 0 ),
            frequency:
            {
                min: 1,
                max: 2
            }
        }
    });
    
    this.display = this.particles.display;
    this.origin = new zen3d.Vector3();
    this.target = new zen3d.Vector3();
    this.lerpPos = 0;
    
    //this.display = new zen3d.Mesh( new zen3d.SphereGeometry( 0.2 ), new zen3d.BasicMaterial() );
    
    // add to world
    App.physics.world.add( this.body );
    App.scene.add( this.display );
    
    // updates
    ECS.updates.push ( this );
}

ECS.StaffShot.prototype = Object.create( ECS.MapItem.prototype );
ECS.StaffShot.prototype.constructor = ECS.StaffShot;

ECS.StaffShot.prototype.start = function( origin )
{
    this.origin = origin;
    this.target.set( -App.level.currentLane * 0.7, -1.2, -1.2 ).applyQuaternion( App.level.chen.display.quaternion ).add( App.level.chen.display.position );
    this.lerpPos = 0;
    
    this.enabled = true;
    this.display.visible = true;
    this.display.position.copy( origin );
    this.body.position.copy( origin );
    this.particles.setStartTime( 0 );
}

ECS.StaffShot.prototype.onUpdate = function( deltaTime )
{
    // compute world pos
    let oneMinusLerp = 1.0 - this.lerpPos;
    this.body.position.x = this.origin.x * oneMinusLerp + this.target.x * this.lerpPos;
    this.body.position.y = this.origin.y * oneMinusLerp + this.target.y * this.lerpPos;
    this.body.position.z = this.origin.z * oneMinusLerp + this.target.z * this.lerpPos;    
    this.display.position.copy( this.body.position );
    
    this.particles.onUpdate( deltaTime );
    
    // countdown
    this.lerpPos += deltaTime * 1.5;
    
    if ( this.lerpPos > 1 )
    {
        this.disable();
    }
}

ECS.StaffShot.prototype.disable = function()
{
    this.enabled = false;
    this.display.visible = false;
    this.body.velocity.set( 0, 0, 0 );
    this.body.position.set( 0, 10, 0 );
    this.display.position.set( 0, 10, 0 );
}
// </editor-fold>

// --------------------------------------------------------------------------------------------------------------------------
// MAP ITEM CREATION HELPERS ------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------

ECS.createCollider = function( meshes, debug )  // <editor-fold defaultstate="collapsed">
{    
    if ( !Array.isArray( meshes ) ) meshes = [ meshes ];
    
    // get parent
    let parent = meshes[0].parent;  
    
    // create CANNON.Body and apply world position & rotation
    let body = new CANNON.Body();
    body.name = parent.name;
    body.position.set( parent.worldMatrix.elements[12], parent.worldMatrix.elements[13], parent.worldMatrix.elements[14] );
    let mat4 = new zen3d.Matrix4().extractRotation( parent.worldMatrix );
    let quat = new zen3d.Quaternion().setFromRotationMatrix( mat4 );
    body.quaternion.set( quat.x, quat.y, quat.z, quat.w );
    
    // create CANNON.Shapes and apply local position & rotation
    let collider;
    let shape;
    let pos;
    let halfExtents;
    let i;
    let len = meshes.length - 1;
    
    for ( i = len; i >= 0; i-- )
    {
        collider = meshes[i];

        pos = new CANNON.Vec3();
        AppUtils.convertPosition( collider.position, pos );
        pos.x *= parent.scale.x;
        pos.y *= parent.scale.y;
        pos.z *= parent.scale.z;

        quat = new CANNON.Quaternion();
        AppUtils.convertQuaternion( collider.quaternion, quat );

        halfExtents = new CANNON.Vec3
        ( 
            collider.scale.x * parent.scale.x * 0.5,
            collider.scale.y * parent.scale.y * 0.5,
            collider.scale.z * parent.scale.z * 0.5
        );

        shape = new CANNON.Box( halfExtents );
        body.addShape( shape, pos, quat );
        
        // create debug visual
    
        if ( debug )
        {
            if ( !body.debugMesh )
            {
                body.debugMesh = new zen3d.Object3D();
                body.debugMesh.visible = false;
                AppUtils.convertPosition( body.position, body.debugMesh.position );
                AppUtils.convertQuaternion( body.quaternion, body.debugMesh.quaternion );
            }

            let submesh = new zen3d.Mesh( ECS.debugCubeGeo, collider.material );
            AppUtils.convertHalfExtentsToScale( halfExtents, submesh.scale );
            AppUtils.convertPosition( pos, submesh.position );
            AppUtils.convertQuaternion( quat, submesh.quaternion );

            body.debugMesh.add( submesh );
            shape.debugMesh = submesh;
        }
        
        // remove collider
        
        collider.geometry.dispose();
        parent.remove( collider );
    }
    
    return body;
}
// </editor-fold>

// ECS.transformToNewParent --------------------------------------------------------------------------------------------------------------------------------

// <editor-fold defaultstate="collapsed">

ECS.transformToNewParent = function( mesh, newParent )
{
    let worldPos = AppUtils.getWorldPosition( mesh );
    let inverse = new zen3d.Matrix4().getInverse( newParent.worldMatrix );
    worldPos.applyMatrix4( inverse );
    mesh.position = worldPos;
    newParent.add( mesh );
}

// </editor-fold>

// ECS.extractKeyframeClip --------------------------------------------------------------------------------------------------------------------------------

// <editor-fold defaultstate="collapsed">

ECS.extractKeyframeClip = function( gltf, meshes, interpolant = true )
{    
    if ( meshes instanceof Array === false ) meshes = [ meshes ];
    
    let tracks = [];
    let track;
    let a;
    let i;
    let targetNames = [];
    
    for ( i = 0 ; i < meshes.length; i++ )
    {
        for( a = 0; a < gltf.animations[0].tracks.length; a++ )
        {
            track = gltf.animations[0].tracks[a];
            
            if ( track.target === meshes[i] )
            {
                track.childIndex = i;
                track.interpolant = interpolant;
                tracks.push( track );

                if ( targetNames.indexOf( track.target.name ) === -1 ) targetNames.push( track.target.name );
            }
        }
    }
    
    if ( tracks.length === 0 ) return null;
    
    // build KeyframeClip    
    let startFrame = +Infinity;
    let endFrame = -Infinity;
    
    for ( i = 0; i < tracks.length; i++ )
    {        
        startFrame = Math.min( startFrame, tracks[i].times[ 0 ] );
        endFrame = Math.max( endFrame, tracks[i].times[ tracks[i].times.length - 1 ] );
    }
    
    // create keyframe clip    
    let keyframeClip = new zen3d.KeyframeClip();
    keyframeClip.tracks = tracks;
    keyframeClip.startFrame = startFrame;
    keyframeClip.endFrame = endFrame;
    keyframeClip.frame = 0;
    keyframeClip.targetNames = targetNames;
    
    return keyframeClip;    
}

// </editor-fold>

ECS.cloneKeyframeClip = function( originalClip, newTargets )
{
    let keyframeClip = new zen3d.KeyframeClip();
    keyframeClip.endFrame = originalClip.endFrame;
    keyframeClip.frame = originalClip.frame;
    keyframeClip.loop = originalClip.loop;
    keyframeClip.name = originalClip.name;
    keyframeClip.startFrame = originalClip.startFrame;
    keyframeClip.targetNames = originalClip.targetNames;
    keyframeClip.skinnedMesh = originalClip.skinnedMesh;

    let track;
    let cloneTrack;
    let len = originalClip.tracks.length;
    let i;
    let newTarget;

    for ( i = 0; i < len; i++ )
    {
        track = originalClip.tracks[i];
        newTarget = newTargets[track.childIndex];

        cloneTrack = new zen3d.VectorKeyframeTrack
        ( 
            newTarget,
            track.propertyPath,
            Float32Array.from( track.times ),
            Float32Array.from( track.values ),
            track.interpolant
        );

        keyframeClip.tracks.push( cloneTrack );
    }
    
    return keyframeClip;
}

ECS.cropKeyframeClip = function( keyframeClip, endFrame )
{
    let a, b;
    let track;
    
    for ( a = 0; a < keyframeClip.tracks.length; a++ )
    {
        track = keyframeClip.tracks[a];
        
        for ( b = 0; b < track.times.length; b++ )
        {
            if ( track.times[b] > endFrame )
            {
                track.times = track.times.subarray( 0, b );
                
                if ( track.propertyPath === "position" || track.propertyPath === "scale" )
                {
                    b *= 3;
                }
                else if ( track.propertyPath === "quaternion" )
                {
                    b *= 4;
                }
                
                track.values = track.values.subarray( 0, b );
                
                break;
            }
        }
    }
    
    keyframeClip.endFrame = endFrame;
}

/*
ECS.createKeyframeClip = function( data )
{
    let keyframeClip = new zen3d.KeyframeClip();
    keyframeClip.endFrame = data.times[ data.times.length - 1 ];
    keyframeClip.frame = 0;
    keyframeClip.loop = data.loop;
    keyframeClip.name = "anim";
    keyframeClip.startFrame = data.times[0];
    
    let i;
    let track;
    
    for ( i = 0; i < data.tracks.length; i++ )
    {
        track = data.tracks[i];
        
        switch( track.propertyPath )
        {
            case "position":
                
                track = new zen3d.VectorKeyframeTrack( data.target, "position", Float32Array.from( track.times ), Float32Array.from( track.values ), true );
                break;
                
            
            case "quaternion":
                
                track = new zen3d.QuaternionKeyframeTrack( data.target, "quaternion", Float32Array.from( track.times ), Float32Array.from( track.values ), true );
                break;
                
                
            case "euler":
                
                let quaternions = [];
                let quat;
                
                for ( let a = 0; a < track.values.length; a+=3 )
                {
                    quat = new zen3d.Quaternion().setFromEuler( new zen3d.Euler( track.values[a], track.values[a+1], track.values[a+2] ) );
                    quaternions.push( quat );
                }
                
                track = new zen3d.QuaternionKeyframeTrack( data.target, "quaternion", Float32Array.from( track.times ), Float32Array.from( quaternions ), true );
                break; 
                
        }
                
        keyframeClip.tracks.push( track );
    }
    
    return keyframeClip;
}
*/

ECS.setAnimationTarget = function( keyframeClip, newTarget )
{
    let i;
    
    for ( i = 0; i < keyframeClip.tracks.length; i++ )
    {
        keyframeClip.tracks[i].target = newTarget;
    }
}

ECS.setAnimationTime = function( keyframeClip, newTime )
{
    let i;
    
    for ( i = 0; i < keyframeClip.tracks.length; i++ )
    {
        keyframeClip.frame = newTime;
    }
}

/*
ECS.createTrack = function( data )
{
    let track =
    {
        type: data.propertyPath,
        time: 0,
        last: 0,
        next: 1,
        delta: 0,
        current: null,
        times: [],
        values: []
    };
    
    let i = 0;
    
    for( i = 0; i < data.times.length; i++ )
    {
        track.times.push( data.times[i] );
        
        if ( track.type === "position" )
        {
            track.values.push( new zen3d.Vector3( data.values[i*3+0], data.values[i*3+1], data.values[i*3+2] ) );
        }
        else if ( track.type === "quaternion" )
        {
            track.values.push( new zen3d.Quaternion( data.values[i*4+0], data.values[i*4+1], data.values[i*4+2], data.values[i*4+3] ) );
        }
    }
    
    return track;
}
*/