"use strict";

/* 
 * FT V0.4
 * fuel new media / Paul Schlichter
 * animation player for importing flash animations to plain HTML/CSS nodes
 */


// create animation:
// 
// anim = FT.create( json_data, spritesheet, { debug: true } );
// stage.appendChild( anim.display );


// set position:
// 
// anim.x = 400;


// call method on child:
// 
// anim.childName.gotoAndStop( 10 );

    


// version 0.4 / 13.01.2020

// improved: flash-like dot notation to call members of the display tree
// todo: fix unnecessary json de- and encoding, leave the json untouched instead
// todo: improve cleanup method


// version 0.3 / 10.01.2020

// improved: flash-like reset of current frame when timeline display object not visible
// improved: processing timeline only when it's progressing
// fixed: multiple creation with same json data
// fixed: target in actionscript play not working
// fixed: stop() not working


// version 0.2 / 09.01.2020

// improved: independent fps for each timeline, ticker system
// fixed: do skew after other transforms, because flash has a different matrix composition order
// todo: target in actionscript play not working ( r_arm.r_hand )
// todo: stop() not working - maybe due to script processing after animation processing?



// initial version 0.1 / 13.12.2019


//////////////////////////////////////////////////////// CLASSES /////////////////////////////////////////////////////////////

class FT_Node
{
    constructor()
    {
        this._name = "";
        this._enabled = true;
        this.timeline = {};
        this._fps = 30;
        this._blendMode = undefined;
        
        this._display = document.createElement( "div" );
        this._display.style.position = "absolute";
        this._display.style.transformOrigin = "0px 0px";
        this._display.style.left = "0px";
        this._display.style.top = "0px";
        
        this._w = 0;
        this._h = 0;
        
        this._v = true;
        this._a = 1;
        this._x = 0;
        this._y = 0;
        this._sx = 1;
        this._sy = 1;
        this._skx = 0;
        this._sky = 0;
        
        this._tex = "";
        this._uvs = {};
        
        this.logMessages = false;
    }
    
    get display() { return this._display };
    
    get enabled() { return this._enabled };
    set enabled( e )
    {
        this._enabled = e;

        if ( FT.logMessages )
        {
            if ( !e )
            {
                FT.log( "FT  disabled '" + this.name + "'  " );
            }
            else
            {
                FT.log( "FT  enabled '" + this.name + "'  " );
            }
        }
    }
    
    get visible() { return this._v }    
    set visible( v )
    {
        this._v = v;
        
        if ( v )
        {
            this._display.style.visibility = "inherit";
        }
        else
        {
            this._display.style.visibility = "hidden";
        }
    }
    
    get alpha() { return this._a }    
    set alpha( a ) 
    { 
        this._a = a;
        this._display.style.opacity = a;
    }

    set transform( tf )
    {
        this._x = tf.x;
        this._y = tf.y;
        this._sx = tf.scaleX;
        this._sy = tf.scaleY;
        this._skx = tf.skewX;
        this._sky = tf.skewY;
        
        this.updateMatrix();
    }
    
    get x() { return this._x };
    set x( x )
    {
        this._x = x;
        this.updateMatrix();
    }
    
    get y() { return this._y };
    set y( y )
    {
        this._y = y;
        this.updateMatrix();  
    }
    
    get width() { return this._w };
    set width( w )
    {
        this._w = w;
        this._display.style.width = w + "px";
    }
    
    get height() { return this._h };
    set height( h )
    {
        this._h = h;
        this._display.style.height = h + "px";
    }
    
    get scaleX() { return this._sx };
    set scaleX( sx )
    {
        this._sx = sx;
        this.updateMatrix();
    }
    
    get scaleY() { return this._sy };
    set scaleY( sy )
    {
        this._sy = sy;
        this.updateMatrix();
    }
    
    get rotation() { return this._skx * FT.Rad2Deg };
    set rotation( skx )
    {
        this._skx = skx * FT.Deg2Rad;

        // matrix calculations
        
        var scaleX = this._sx;
        var scaleY = this._sy;
        var skewX = this._skx;
        
        scaleX *= Math.cos( skewX );
        scaleY *= Math.cos( - skewX );

        skewX = Math.sin( skewX );
        
        this._sx = scaleX;
        this._sy = scaleY;
        this._skx = skewX;
        this._sky = - skewX;
        
        this.updateMatrix();
    }
    
    get texture() { return this.tex };
    set texture( tex )
    {
        this._tex = tex;
        this._display.style.backgroundImage = tex;
    }
    
    get uvs() { return this._uvs };
    set uvs( uvs )
    {
        this._uvs = uvs;
        this._display.style.backgroundPosition = "-" + uvs.x + "px -" + uvs.y + "px";
    }
    
    get fps() { return this._fps };
    set fps( fps )
    { 
        this._fps = fps;
        this.timeline.tick = 1000 / this._fps;
        this.timeline.playbackSpeed = 60 / this._fps;
    };
    
    get blendMode() { return this._blendMode };
    set blendMode( mode )
    { 
        this._blendMode = mode;
        this._display.style.backgroundBlendMode = mode;
    };
    
    updateMatrix()
    {
        this._display.style.transform = 
            "matrix( " +
            this._sx + ", " +
            this._skx + ", " +
            this._sky + ", " +
            this._sy + ", " +
            this._x + ", " +
            this._y + " )";
    }
    
    gotoAndPlay( frame_or_label )
    {
        // start timeline
        this.timeline.isPlaying = true;

        // inform the update loop that playhead has changed
        this.timeline.last = -1;

        // inform the update loop that the playhead should not be changed when invisible
        this.timeline.userCommand = "play";

        // get frame
        if ( frame_or_label != undefined )
        {
            var fr = FT.getFrameOrLabel( this.timeline, frame_or_label );

            if ( fr != undefined )
            {
                this.timeline.current = FT.getFrameOrLabel( this.timeline, frame_or_label );
            }
            else
            {
                FT.log( "FT  warning:  movieclip '" + this.name + "' frame '" + frame_or_label + "' not found ", true );
            }
        }
    }
    
    play()
    {
        // start timeline
        this.timeline.isPlaying = true;

        // inform the update loop that playhead has changed
        this.timeline.last = -1;

        // inform the update loop that the playhead should not be changed when invisible
        this.timeline.userCommand = "play";
    }

    gotoAndStop( frame_or_label )
    {
        // stop timeline
        this.timeline.isPlaying = false;

        // inform the update loop that playhead has changed
        this.timeline.last = -1;

        // inform the update loop that the playhead should not be changed when invisible
        this.timeline.userCommand = "stop";

        if ( frame_or_label != undefined )
        {
            var fr = FT.getFrameOrLabel( this.timeline, frame_or_label );

            if ( fr != undefined )
            {
                this.timeline.current = fr;
            }
            else
            {
                FT.log( "FT  warning:  movieclip '" + this.name + "' frame '" + frame_or_label + "' not found ", true );
            }
        }
    }
    
    stop()
    {
        // stop timeline
        this.timeline.isPlaying = false;

        // inform the update loop that playhead has changed
        this.timeline.last = -1;

        // inform the update loop that the playhead should not be changed when invisible
        this.timeline.userCommand = "stop";
    }

    nextFrame()
    {
        // stop timeline
        this.timeline.isPlaying = false;

        // progress
        this.timeline.current++;

        // inform the update loop that the playhead should not be changed when invisible
        this.timeline.userCommand = "nextFrame";
    }

    prevFrame()
    {
        // stop timeline
        this.timeline.isPlaying = false;

        // progress
        this.timeline.current--;

        // inform the update loop that the playhead should not be changed when invisible
        this.timeline.userCommand = "prevFrame";
    }
}

class FT_Timeline
{
    constructor( name, frameCount )
    {
        this.name = name;
        this.last = -1;
        this.current = 0;
        this.total = frameCount;
        this.children = [];
        this.tweens = [];
        this.isPlaying = true;
        this.ticker = 0;
        this.tick = 1000 / FT.json.fps;
        this.playbackSpeed = 1;
        this.labels = {};
        this.scripts = {};
    }
}

class FT_Tween
{
    constructor()
    {
        this.total = 1;
        this.visible = [];
        this.x = [];
        this.y = [];
        this.scaleX = [];
        this.scaleY = [];
        this.skewX = [];
        this.skewY = [];
        this.alpha = [];
    }
}

var FT = 
{   
    animNodes: [],
    objects: [],
    lastTime: 0,
    deltaTime: 0,
    resetTiming: false,
    isPlaying: true,
    callbacks: [],
    objectCount: 0,
    autoUpdate: false,
    autoUpdateRunning: false,
    debug: false,
    Deg2Rad: 3.1415 / 180,
    Rad2Deg: 180 / 3.1415,
    BLEND_MODES: { MULTIPLY: "multiply", ADD: "add", SCREEN: "screen" }
};


/**
 * Creates an animation from json data
 * @param {string} json json data
 * @param {string} path src path to texture atlas
 * @param {Object} config configuration data
 * @param {bool} config.autoplay play the timeline instantly
 * @param {bool} config.autoUpdate Whether FT should create it's own renderloop
 */
FT.create = function( json, texture, callback )
{
    // store callback function
    this.callback = callback;
    
    // if json is url, fetch json first
    if ( typeof( json ) !== "object" )
    {
        fetch( json )
        .then( response => { return response.json(); } )
        .then( json => FT._create( json, texture ) );
    }
    else
    {
        FT._create( json, texture );
    }
}

FT._create = function( json, texture )
{
    // read config
    /*
    if ( config )
    {
        if ( config.hasOwnProperty( "debug" ) )
        {
            FT.debug = config.debug;
        }
        
        if ( config.hasOwnProperty( "autoplay" ) )
        {
            FT.isPlaying = config.autoplay;
        }

        if ( config.hasOwnProperty( "autoUpdate" ) )
        {
            FT.autoUpdate = config.autoUpdate;
        }
    }
    */
   
    // start gameloop

    if ( FT.autoUpdate && !FT.autoUpdateRunning )
    {
        FT.autoUpdateRunning = true;
        window.requestAnimationFrame( FT.onUpdate );
    }
    
    // store tex
    
    FT.json = json;
    FT.texture = texture;
    FT.tween_Debug_ID = 0;
    
    // create 2D array for the timelines
    
    FT.animNodes[ FT.objectCount ] = [];

    // create root display
    
    var root = FT.createNode( FT.json.root );
    root.texture = texture;
    root.ftid = FT.objectCount;
    root.enabled = true;
    
    // debug
    
    if ( FT.debug )
    {
        FT.debug_box = document.createElement( "div" );
        FT.debug_box.style.position = "absolute";
        FT.debug_box.style.width = "70px";
        FT.debug_box.style.height = "45px";
        FT.debug_box.style.backgroundColor = "#000";
        FT.debug_box.style.color = "#bada55";
        FT.debug_box.style.padding = "10px";
        FT.debug_box.style.fontFamily = "Arial";
        FT.debug_box.style.fontSize = ".8em";
        
        FT.debug_box.textContent = "frame";
        
        document.body.appendChild( FT.debug_box );
    }

    // create a deep copy of the json
    
    var data = JSON.parse( JSON.stringify( json ) );
    
    // iterate through data
    
    FT.createNode( data.root, root, data );
    FT.resolveScriptTargets();
    
    // increase object count
    
    FT.objectCount++;
    FT.objects.push( root );
    
    // cleanup
    
    FT.json = {};
    FT.texture = "";
    
    // output
    
    FT.log( "FT.create: '" + root.name + "'  " );
    
    // return
    
    this.callback( root );
}

FT.remove = function( node )
{    
    if ( node.ftid == undefined )
    {
        FT.log( "FT  warning: '" + node.name + "' is no root node or doesn't exist ");
        return;
    }
    
    FT.animNodes.splice( node.ftid, 1 );
    FT.objects.splice( node.ftid, 1 );
    FT.objectCount--;

    for ( var i = 0; i < FT.objects.length; i++ )
    {
        FT.objects[i].ftid = i;
    }
    
    FT.log( "FT  removed '" + node.name + "'  " );
}

FT.onVisibilityChange = function()
{
    if ( !document.hidden ) FT.lastTime = Date.now();
}

//////////////////////////////////////////////////////// CREATION /////////////////////////////////////////////////////////////

// <editor-fold>

FT.createNode = function ( name )
{
    // get this node's data
    
    var nodeData = this.findArrayElementByName( name, FT.json.library );
    
    // create node
    
    var node = new FT_Node();
    node.name = name;

    // check if bitmap
    
    if ( nodeData.type == "bmp" )
    {
        var texData = FT.getTexture( name, FT.json.tex.frames );
        node.width = texData.frame.w;
        node.height = texData.frame.h;
        node.uvs = texData.frame;
        node.texture = "url( " + FT.texture + " )";
        
        // set blendMode
        
        if ( nodeData.blend )
        {
            switch( nodeData.blend )
            {
                case "ADD":                    
                    node.blendMode = FT.BLEND_MODES.ADD;
                    break;
                    
                case "SCREEN":
                    node.blendMode = FT.BLEND_MODES.SCREEN;
                    break;
                    
                case "MULTIPLY":
                    node.blendMode = FT.BLEND_MODES.MULTIPLY;
                    break;
            }
        }
        
        // finish, as bitmaps dont have children or timelines
        
        return node;
    }
    
    // add to FT.animNodes
    
    FT.animNodes[FT.objectCount].push( node );

    // create node timeline

    node.timeline = new FT_Timeline( name, nodeData.frameCount );

    // create children
    
    if ( nodeData.children )
    {
        var c;
        var child;
        var tween;

        for ( c = nodeData.children.length - 1; c >= 0; c-- )
        {
            // create child

            child = this.createNode( nodeData.children[c].name );
            node.timeline.children.push( child );

            // create tweens for child

            tween = FT.createTween( node.timeline, nodeData.children[c].frames );
            node.timeline.tweens.push( tween );
            node.timeline.id = FT.tween_Debug_ID;
            FT.tween_Debug_ID += 1;

            // set initial transform

            child.transform = 
            {
                x: tween.x[0],
                y: tween.y[0],
                scaleX: tween.scaleX[0],
                scaleY: tween.scaleY[0],
                skewX: tween.skewX[0],
                skewY: tween.skewY[0]
            };

            child.visible = tween.visible[0];
            child.alpha = tween.alpha[0];

            // append to display list

            node.display.appendChild( child.display );

            // create reference for flash-like display list coding

            node[ child.name ] = child;
        }
    }

    // create labels & scripts, but only if there is more than 1 frame

    if ( nodeData.frameCount > 1 )
    {
        var time = 0;
        
        // create labels

        if ( nodeData.labels != undefined )
        {
            for ( var lb = 0; lb < nodeData.labels.length; lb++ )
            {
                time = parseInt( nodeData.labels[lb].t );
                node.timeline.labels[ nodeData.labels[lb].id ] = time;
            }
        }

        // evaluate scripts (maybe in a second pass? or call a global function instead of using addCallback?

        if ( nodeData.scripts != undefined )
        {
            time = 0;

            for ( var s = 0; s < nodeData.scripts.length; s++ )
            {
                time = parseInt( nodeData.scripts[s].t );
                node.timeline.scripts[time] = nodeData.scripts[s];
            }
        }
    }
   
    return node;
}

FT.createDisplayObject = function( nodeData )
{
    var display = new FT_Display_Object();
    
    if ( nodeData != undefined )
    {
        var texData = FT.getTexture( nodeData.name, data.tex.frames );
        display.width = texData.frame.w;
        display.height = texData.frame.h;
        display.uvs = texData.frame;
        display.texture = "url( " + FT.texture + " )";
    }
    
    return display;
}

FT.createTween = function( timeline, frameData )
{
    var tween = new FT_Tween();
    
    // set initial transform
    
    var from = this.createTransform( frameData[0] );
    var to;
    var start;
    var duration;
    
    // frame 0 to n

    // fix for children with only 1 frame

    if ( frameData.length == 1 )
    {
        from = to = this.createTransform( frameData[ 0 ] );

        start = 0;
        duration = timeline.total;

        FT.appendTween( tween, from, to, start, duration );
    }

    // create frames

    for ( var fr = 0; fr < frameData.length - 1; fr++ )
    {
        from = this.createTransform( frameData[ fr ] );
        to = this.createTransform( frameData[ fr+1 ] );
        to.ease = from.ease;

        start = frameData[ fr ].t;
        duration = frameData[ fr+1 ].t - start;

        FT.appendTween( tween, from, to, start, duration );
    }

    // if last frame is not a keyframe, fill up the missing frames

    if ( tween.total < timeline.total )
    {
        from = to;

        start = tween.total;
        duration = timeline.total - start;

        FT.appendTween( tween, from, to, start, duration );
    }
    
    // matrix calculations
    
    var scaleX = 0;
    var scaleY = 0;
    var skewX = 0;
    var skewY = 0;
    
    for ( fr = 0; fr < tween.total; fr++ )
    {
        scaleX = tween.scaleX[fr];
        scaleY = tween.scaleY[fr];
        skewX = tween.skewX[fr] * FT.Deg2Rad;
        skewY = tween.skewY[fr] * FT.Deg2Rad;
        
        scaleX *= Math.cos( skewX );
        scaleY *= Math.cos( skewY );
        
        skewX = Math.sin( skewX );
        skewY = - Math.sin( skewY );
        
        tween.scaleX[fr] = scaleX;
        tween.scaleY[fr] = scaleY;
        tween.skewX[fr] = skewX;
        tween.skewY[fr] = skewY;
    }
    
    // done
    
    return tween;
}

FT.appendTween = function( tween, from, to, start, duration )
{    
    var complete = 0;
    var frame = 0;
    
    for ( var a = 0; a <= duration; a++ )
    {
        complete = a / duration;
        
        frame = start + a;

        tween.visible[frame] = from.visible;
        tween.x[frame] = FT.calcEase( from.x, to.x, complete, to.ease );
        tween.y[frame] = FT.calcEase( from.y, to.y, complete, to.ease );
        tween.scaleX[frame] = FT.calcEase( from.scaleX, to.scaleX, complete, to.ease );
        tween.scaleY[frame] = FT.calcEase( from.scaleY, to.scaleY, complete, to.ease );
        tween.skewX[frame] = FT.calcEase( from.skewX, to.skewX, complete, to.ease );
        tween.skewY[frame] = FT.calcEase( from.skewY, to.skewY, complete, to.ease );
        tween.alpha[frame] = FT.calcEase( from.alpha, to.alpha, complete, to.ease );
    }

    tween.total = tween.visible.length;
    tween.visible[tween.total-1] = to.visible;
}

FT.createTransform = function( currentFrame )
{    
    var tf = {};
    
    // visibility

    if ( currentFrame.v == 1 )
    {
        tf.visible = ( currentFrame.v == 1 );
    }
    else
    {
        tf.visible = false;
    }

    // easing

    if ( currentFrame.hasOwnProperty( "ease" ) )
    {        
        tf.ease = currentFrame.ease;
    }
    
    // transforms
    
    if ( currentFrame.hasOwnProperty( "x" ) )
    {
        tf.x = currentFrame.x;
    }
    else
    {
        tf.x = 0;
    }
    
    if ( currentFrame.hasOwnProperty( "y" ) )
    {
        tf.y = currentFrame.y;
    }
    else
    {
        tf.y = 0;
    }
    
    if ( currentFrame.hasOwnProperty( "skx" ) )
    {
        tf.skewY = currentFrame.skx;
    }
    else
    {
        tf.skewY = 0;
    }
    
    if ( currentFrame.hasOwnProperty( "sky" ) )
    {
        tf.skewX = currentFrame.sky;
    }
    else
    {
        tf.skewX = 0;
    }
    
    if ( currentFrame.hasOwnProperty( "sx" ) )
    {
        tf.scaleX = currentFrame.sx;
    }
    else
    {
        tf.scaleX = 1;
    }
    
    if ( currentFrame.hasOwnProperty( "sy" ) )
    {
        tf.scaleY = currentFrame.sy;
    }
    else
    {
        tf.scaleY = 1;
    }
    
    // compensated skew
    
    if ( currentFrame.hasOwnProperty( "a" ) )
    {
        tf.alpha = currentFrame.a / 100;
    }
    else
    {
        tf.alpha = 1;
    }
    
    if ( currentFrame.hasOwnProperty( "tint" ) )
    {
        tf.tint = currentFrame.tint.rgb;
    }
    else
    {
        tf.tint = 0;
    }
    
    return tf;
}

FT.calcEase = function( from, to, percent, ease )
{
    if ( ease != undefined )
    {
        ease /= -100;

        var percentPow = percent * percent;

        var linear = to * percent + from * ( 1 - percent );
        var power = to * percentPow + from * ( 1 - percentPow );

        var lerp = linear * ( 1 - ease ) + power * ease;
        
        return lerp;
    }
    else
    {
        if ( percent < 1 )
        {
            return from;
        }
        else
        {
            return to;
        }
    }
}

FT.getTexture = function( name, frames )
{    
    for ( var a = 0; a < frames.length; a++ )
    {
        if ( frames[a].filename == name )
        {
            return frames[a];
        }
    }
    
    return null;
}

FT.getTime = function( label, array )
{    
    for ( var a = 0; a < array.length; a++ )
    {
        if ( array[a].name == label )
        {
            return array[a].t;
        }
    }
    
    return null;
}

// </editor-fold>

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////// UPDATE LOOP /////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * FT's renderloop
 * If FT.autoUpdate is false,
 * add this function to any custom update loop
 */
FT.onUpdate = function( deltaTime )
{
    FT.deltaTime = deltaTime;

    // debug
    if ( FT.debug )
    {
        FT.debug_box.innerHTML = FT.deltaTime + " ms<br>" + FT.objectCount + " roots<br>" + FT.tween_Debug_ID + " anims";
    }
    
    // global play / pause
    //if ( !FT.isPlaying ) return;
    
    // iterate through objects
    var an = 0;
    var animCount = FT.animNodes.length;
    var animNode;
    var timeline;
    
    var tl = 0;
    var tlCount;
    var childCount;
    var tween;
    var child;
    var script;    
    var targetTimeline;
    
    // every obj is one imported animation asset

    for ( an = 0; an < animCount; an++ )
    {        
        animNode = FT.animNodes[an][0];
        
        // abort if object is disabled
        if ( !animNode.enabled ) continue;
        
        // abort if timeline has only 1 frame
        timeline = animNode.timeline;
        if ( timeline.length < 2 ) continue;

        // increase ticker of root object
        // all children have the same fps, so we need to do this only for the root object
        timeline.ticker += FT.deltaTime;
        
        // abort if frame not reached
        if ( timeline.ticker < timeline.tick ) continue;
        
        // make tick
        timeline.ticker -= timeline.tick;
        if ( FT.resetTiming ) timeline.ticker = 0;
        
        // iterate through children
        
        tlCount = FT.animNodes[an].length;

        for ( tl = 0; tl < tlCount; tl++ )
        {
            animNode = FT.animNodes[an][tl];
            timeline = animNode.timeline;
            
            // abort if object is disabled
            if ( !animNode.enabled ) continue;
            
            // reset timeline to frame 1 if display object is invisible
            if ( !animNode.visible )
            {
                timeline.last = -1;
                timeline.current = 0;
                timeline.isPlaying = true;
                
                continue;
            }
            
            // abort if last frame == current frame
            if ( timeline.last == timeline.current ) continue; 

            // script execution --------------------------------------------------------------

            script = timeline.scripts[timeline.current];
            targetTimeline = timeline;
            
            if ( script && !timeline.userCommand )
            {
                if ( script.c == "stop" )
                {
                    if ( script.tg != undefined ) targetTimeline = script.tg.timeline;

                    targetTimeline.isPlaying = false;
                }
                if ( script.c == "play" )
                {
                    if ( script.tg != undefined ) targetTimeline = script.tg.timeline;

                    targetTimeline.isPlaying = true;
                    targetTimeline.current++;
                }
                if ( script.c == "gotoAndStop" )
                {                    
                    if ( script.tg != undefined ) targetTimeline = script.tg.timeline;

                    targetTimeline.current = FT.getFrameByLabel( timeline.labels, script.p );
                    targetTimeline.isPlaying = false;
                }
                if ( script.c == "gotoAndPlay" )
                {
                    if ( script.tg != undefined ) targetTimeline = script.tg.timeline;

                    targetTimeline.current = FT.getFrameByLabel( targetTimeline.labels, script.p );
                    targetTimeline.isPlaying = true;
                }
                if ( script.c == "nextFrame" )
                {
                    if ( script.tg != undefined ) targetTimeline = script.tg.timeline;

                    targetTimeline.current++;
                    targetTimeline.isPlaying = false;
                }
                if ( script.c == "prevFrame" )
                {
                    if ( script.tg != undefined ) targetTimeline = script.tg.timeline;

                    targetTimeline.current--;
                    targetTimeline.isPlaying = false;
                }
            }
            
            // delete userCommand
            timeline.userCommand = false;
            
            // clamp playhead
            targetTimeline.current = Math.min( targetTimeline.current, targetTimeline.total );
            targetTimeline.current = Math.max( targetTimeline.current, 0 );
            
            // display transforms --------------------------------------------------------------

            // iterate through children
            childCount = timeline.children.length;

            for ( var c = 0; c < childCount; c++ )
            {
                // convenience
                
                child = timeline.children[c];
                tween = timeline.tweens[c];

                // todo: if child is removed, delete its data

                /*
                
                // if the end of the tween is reached, set the last transform

                if ( tween.total - 1 < tween.current )
                {
                    // set visibility
                    
                    child.visible = tween.visible[tween.total - 1];
                }
                
                */

                // set visibility
                
                child.visible = tween.visible[timeline.current];
                
                // set transform, but only if visible
                
                if ( tween.visible[timeline.current] )
                {            
                    child.alpha = tween.alpha[timeline.current];

                    child.transform =  
                    {
                        x: tween.x[timeline.current],
                        y: tween.y[timeline.current],
                        scaleX: tween.scaleX[timeline.current],
                        scaleY: tween.scaleY[timeline.current],
                        skewX: tween.skewX[timeline.current],
                        skewY: tween.skewY[timeline.current]
                    };
                }
            }
            
            // timeline progression --------------------------------------------------------------
       
            // cache last frame
            
            timeline.last = timeline.current;
            
            // progress timeline
            
            if ( timeline.isPlaying ) timeline.current++;
            
            // flash-like looping
            
            if ( timeline.current >= timeline.total ) timeline.current = 0;
        }
    }
    
    // clear resetTiming
    FT.resetTiming = false;
    
    // execute callbacks
    
    for( var i = 0; i < FT.callbacks.length; i++ )
    {
        FT.callbacks[i]( FT.deltaTime );
    }
}

FT.getFrameByLabel = function( labels, id )
{    
    var frame = parseInt( id ) - 1;

    if ( isNaN( frame ) )
    {
        frame = labels[id];
    }
    
    return frame;
};

FT.getFrameOrLabel = function( timeline, frame_or_label )
{
    var frame = frame = parseInt( frame_or_label );

    if ( isNaN( frame ) )
    {
        frame = timeline.labels[frame_or_label];
    }
    
    return frame;
};

FT.resolveScriptTargets = function()
{
    var timeline;
    var script;
    var scriptTarget;
    
    for( var tl = 0; tl < FT.animNodes[FT.objectCount].length; tl++ )
    {
        timeline = FT.animNodes[FT.objectCount][tl].timeline;
        
        if ( timeline.scripts )
        {
            for( var s in timeline.scripts )
            {                
                script = timeline.scripts[s];
                
                if( script.tg )
                {
                    scriptTarget = script.tg;
 
                    for( var tl2 = 0; tl2 < FT.animNodes[FT.objectCount].length; tl2++ )
                    {
                        if ( FT.animNodes[FT.objectCount][tl2].name == scriptTarget )
                        {                            
                            script.tg = FT.animNodes[FT.objectCount][tl2];
                            break;
                        }
                    }
                }
            }
        }
    }
}

FT.findArrayElementByName = function ( name, array )
{
    for ( var a = 0; a < array.length; a++ )
    {
        if ( array[a].name == name )
        {
            return array[a];
        }
    }
    
    return null;
}

/**
 * Add a function to FT's renderloop
 * @param {function}
 */
FT.addCallback = function( func )
{
    FT.callbacks.push( func );
}

FT.log = function( log, error )
{
    if ( error )
    {
        console.log( "%c " + log, 'background: #cc2010; color: #fff' );
    }
    else
    {
        console.log( "%c " + log, 'background: #a0b055; color: #fff' );
    }
}