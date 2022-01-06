



function Physics()
{
    // init
    
    this.fixedTimeStep = 1 / App.fps;
    this.maxSubSteps = 2;
    
    // collision filters & groups
    
    this.CGROUP_STATIC          = Math.pow( 2, 0 );
    this.CGROUP_PLAYER          = Math.pow( 2, 1 );
    this.CGROUP_SENSOR          = Math.pow( 2, 2 );
    this.CGROUP_SHOT            = Math.pow( 2, 3 );
    
    this.CMASK_STATIC           = this.CGROUP_PLAYER | this.CGROUP_SHOT;
    this.CMASK_PLAYER           = this.CGROUP_STATIC | this.CGROUP_SENSOR;
    this.CMASK_SENSOR           = this.CGROUP_PLAYER;
    this.CMASK_SHOT             = this.CGROUP_STATIC;
    
    // create world
    
    this.world = new CANNON.World();
    this.world.quatNormalizeSkip = 10;
    this.world.quatNormalizeFast = true;
    this.world.defaultMaterial.friction = 0;
    this.world.defaultMaterial.restitution = 0;
    this.world.defaultContactMaterial.friction = 0;
    this.world.defaultContactMaterial.restitution = 0;
    //this.world.defaultContactMaterial.contactEquationStiffness = 1000;
    //this.world.defaultContactMaterial.contactEquationRelaxation = 3;
    //this.world.defaultContactMaterial.frictionEquationStiffness = 1000;
    //this.world.defaultContactMaterial.frictionEquationRelaxation = 3;
    
    this.world.gravity.set( 0, -10, 0 );
    
    //this.material = new CANNON.Material( { friction: 0.0, restitution: 0.3 } );
    //this.contactMaterial = new CANNON.ContactMaterial( this.material, this.material );
}

/*
Physics.prototype.onUpdate = function( deltaTime, fixedUpdate )
{
    // update world step
    //this.world.step( this.fixedTimeStep, deltaTime, this.maxSubSteps );
    if ( fixedUpdate ) deltaTime = this.fixedTimeStep;
    this.world.step( deltaTime, deltaTime, this.maxSubSteps );
}
*/

Physics.prototype.onUpdate = function( deltaTime, fixedUpdate )
{
    // update world step
    if ( fixedUpdate ) deltaTime = this.fixedTimeStep;
    this.world.step( deltaTime, deltaTime, this.maxSubSteps );
}

Physics.prototype.removeAllBodies = function()
{
    for ( let i = this.world.bodies.length - 1; i >= 0; i-- )
    {
        this.world.removeBody( this.world.bodies[i] );
    }
}


