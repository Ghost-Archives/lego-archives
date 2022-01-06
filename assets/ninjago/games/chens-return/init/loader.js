'use strict';




function Loader( options )
{
    // props
    this.scripts = [];
    this.progress = [];
    this.complete = [];
    this.loadCount = 0;
    this.firstrun = true;
    
    // init    
    this.options = options;
    
    this.loader = new ZipLoader();
    this.loader.on( 'progress', this.onProgress.bind( this ) );
    this.loader.on( 'load', this.onComplete.bind( this ) );
    this.loader.on( 'error', this.onError.bind( this ) );
}

Loader.prototype.load = function( url )
{
    if ( this.options.useZip )
    {
        this.loader.url = url;
        this.loader.load();
        return;
    }
    else
    {
        this.dispatchEvent( { type: "progress", progress: 1 } );
        this.dispatchEvent( { type: "complete" } );
    }
    
    /*
    if ( this.firstrun )
    {
        this.firstrun = false;
        
        this.scripts = 
        [
            "libs/zen3d.js",
            "libs/cannon.js",
            "libs/flashtween.js",
            "libs/gltfloader.js",
            "libs/gsap.min.js",
            "libs/customease.min.js",
            "libs/orbitcontrols.js",

            "js/asset_loader.js",
            "js/audiohandler.js",
            "js/billboard_material.js",
            "js/camera.js",
            "js/chen.js",
            "js/cookie.js",
            "js/ecs.js",
            "js/face_material.js",
            "js/fast_pbr_material.js",
            "js/fullscreen.js",
            "js/homescreen.js",
            "js/intro.js",
            "js/hud.js",
            "js/input.js",
            "js/landscape_material.js",
            "js/waterfall_material.js",
            "js/denorm_material.js",
            "js/level.js",
            "js/levelparser.js",
            "js/particlesystem.js",
            "js/advanced_particle_system.js",
            "js/physics.js",
            "js/player.js",
            "js/savepoint_manager.js",
            "js/shadowmap_debug_material.js",
            "js/skyboxmaterial.js",
            "js/sprite.js",
            "js/transparent_pbr_material.js",
            "js/unlit_env_material.js",
            "js/unlit_material.js",
            "js/lighting_debugger.js"
        ];
        
        this.dummyLoader();
    }
    else
    {
        this.dispatchEvent( { type: "progress", progress: 1 } );
        this.dispatchEvent( { type: "complete" } );
    }
    */
}

/*
Loader.prototype.dummyLoader = function()
{
    if ( this.loadCount === this.scripts.length )
    {
        this.dispatchEvent( { type: "complete" } );
        return;
    }
    
    // create script
    let script = document.createElement( "script" );
    script.onload = this.dummyLoader.bind( this );
    script.src = this.scripts[this.loadCount];
    document.head.append( script );

    // next
    this.loadCount++;
    this.onProgress( { loaded: this.loadCount, total: this.scripts.length } );
}
*/

Loader.prototype.onProgress = function( event )
{
    this.dispatchEvent( { type: "progress", progress: event.loaded / event.total } );
}

Loader.prototype.onError = function( event )
{
    console.log( 'Loader.onError', event.error );
}

Loader.prototype.onComplete = function()
{
    /*
    this.scripts = [];
    let file;
    let script;
    let i = 0;

    // extract javascript

    for( file in this.loader.files )
    {
        if ( file.substr( file.length - 3 ) === ".js" )
        {
            if ( file.indexOf( "zen3d" ) !== - 1 )
            {
                this.scripts.unshift( file );
            }
            else
            {
                this.scripts.push( file );
            }
        }
    }

    for ( i = 0; i < this.scripts.length; i++ )
    {
        script = document.createElement( "script" );
        script.id = this.scripts[i].substr( this.scripts[i].lastIndexOf( "/" ) + 1 );
        script.type = "text/javascript";
        script.text = this.loader.extractAsText( this.scripts[i], 'text/javascript' );
        document.head.append( script );
    }
    */

    // ready
    this.dispatchEvent( { type: "complete" } );
}

Loader.prototype.addEventListener = function( eventType, callback )
{
    this[eventType].push( callback );
}

Loader.prototype.dispatchEvent = function( event )
{
    if ( !this.hasOwnProperty( event.type ) ) return;
    
    for ( let i = 0; i < this[event.type].length; i++ )
    {
        this[event.type][i]( event );
    }
}

Loader.prototype.extract = function( url )
{    
    // mp3 -> ogg
    if ( App.isIOS && url.indexOf( ".ogg" ) > -1 )
    {
        url = url.replace( ".ogg", ".mp3" );
    }
    
    // direct loading
    if ( !this.options.useZip )
    {
        return url;
    }

    return this.loader.extractAsBlobUrl( url );
}

Loader.prototype.clear = function()
{
    this.loader.clear();
}
