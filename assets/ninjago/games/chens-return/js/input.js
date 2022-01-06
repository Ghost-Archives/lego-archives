


function Input()
{
    // vars
    
    this.start = { x: 0, y: 0 };
    this.delta = { x: 0, y: 0, absX: 0, absY: 0 };
    this.end = { x: 0, y: 0 };
    this.direction = { x: 0, y: 0, z: 0 };
    //this.cameraSpacePos = new zen3d.Vector3( 0, 0, 0 );
    this.currentTouch = -1;
    this.isLocked = false;
    this.lockCount = 0;
    
    // listeners
    
    if ( App.isMobile )
    {
        App.stage.addEventListener( 'touchstart', this.onDown.bind( this ) );
        App.stage.addEventListener( 'touchmove', this.onMove.bind( this ) );
        App.stage.addEventListener( 'touchend', this.onUp.bind( this ) );
    }
    else
    {
        window.addEventListener( 'keydown', this.onKeyDown.bind( this ), false);
        window.addEventListener( 'keyup', this.onKeyUp.bind( this ), false);
        //window.addEventListener( 'click', this.onClick.bind( this ), false);
        //window.addEventListener( 'mousemove', this.onMouseMove.bind( this ), false);
    }
}

Input.prototype.onDown = function( event )
{
    if ( this.currentTouch > -1 ) return;
    
    this.currentTouch = event.which;
    this.start.x = event.changedTouches[ this.currentTouch ].clientX;
    this.start.y = event.changedTouches[ this.currentTouch ].clientY;
}

Input.prototype.onMove = function( event )
{
    if ( event.which !== this.currentTouch ) return;
    
    this.end.x = event.changedTouches[ this.currentTouch ].clientX;
    this.end.y = event.changedTouches[ this.currentTouch ].clientY;
    
    this.delta.x = this.end.x - this.start.x;
    this.delta.y = this.end.y - this.start.y;
    this.delta.absX = Math.abs( this.delta.x );
    this.delta.absY = Math.abs( this.delta.y );
    
    if ( this.delta.absX > this.delta.absY )
    {
        this.direction.x = Math.sign( this.delta.x );
    }    
    else
    {
        this.direction.y = Math.sign( this.delta.y );
    }
}

Input.prototype.onUp = function( event )
{
    if ( event.which !== this.currentTouch ) return;
    
    /*
    if ( this.direction.x === 0 && this.direction.y === 0 )
    {
        this.direction.z = 1;
        
        this.cameraSpacePos.x = ( event.changedTouches[ this.currentTouch ].clientX / App.stageW ) * 2 - 1;
        this.cameraSpacePos.y = - ( event.changedTouches[ this.currentTouch ].clientY / App.stageH ) * 2 + 1;
        this.cameraSpacePos.z = 1;
    }
    */
    
    this.start.x = this.start.y = 0;
    this.delta.x = this.delta.y = this.delta.absX = this.delta.absY = 0;
    this.end.x = this.end.y = 0;
    this.direction.x = this.direction.y = 0;
    this.currentTouch = -1;
}

Input.prototype.onKeyDown = function( event )
{
    if ( event.code == "ArrowRight" )
    {
        this.direction.x = 1;
    }
    if ( event.code == "ArrowLeft" )
    {
        this.direction.x = -1;
    }
    if ( event.code == "ArrowUp" )
    {
        this.direction.y = -1;
    }
    if ( event.code == "ArrowDown" )
    {
        this.direction.y = 1;
    }
}

Input.prototype.onKeyUp = function( event )
{
    this.direction.x = this.direction.y = 0;
}

Input.prototype.unlock = function()
{
    this.isLocked = false;
    this.lockCount = 0;
    //this.direction.z = 0;
}

Input.prototype.consume = function()
{
    this.direction.x = this.direction.y = 0;
    this.currentTouch = -1;
}

/*
Input.prototype.onMouseMove = function( event )
{
    this.cameraSpacePos.x = ( event.clientX / App.stageW ) * 2 - 1;
    this.cameraSpacePos.y = - ( event.clientY / App.stageH ) * 2 + 1;
    this.cameraSpacePos.z = 1;
}

Input.prototype.onClick = function( event )
{
    this.direction.z = 1;
    this.cameraSpacePos.x = ( event.clientX / App.stageW ) * 2 - 1;
    this.cameraSpacePos.y = - ( event.clientY / App.stageH ) * 2 + 1;
    this.cameraSpacePos.z = 1;
}
*/