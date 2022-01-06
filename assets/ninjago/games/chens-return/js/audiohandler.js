/* 
 * Ninjago Game "Prime Empire"
 * Audio Handler
 * V 1.2 / 19.03.2020 / zb@fuel-newmedia.com
 */


function AudioHandler( app )
{
    // Fix up prefixing
    window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
    
    // props
    this.app = app;
    this.context = new window.AudioContext();
	
    // vars
    this.audioObjects = {};
    this.positionals = [];
    this.temporaries = [];
    
    // binds
    this.create = this.create.bind( this );
    //this.loadBuffer = this.loadBuffer.bind( this );
    this.play = this.play.bind( this );
    this.stop = this.stop.bind( this );
    this.setVolume = this.setVolume.bind( this );
    this.setAudioSourceVolume = this.setAudioSourceVolume.bind( this );
    this.destroyTemporaries = this.destroyTemporaries.bind( this );
    this.remove = this.remove.bind( this );
}

AudioHandler.prototype.create = function( id, url )
{
    // abort if id already exists
    if ( this.audioObjects[ id ] ) return;

    // create audio
    let audio;
    
    if ( !this.app.isIOS )
    {
        let src;
    
        if ( typeof( url ) === "string" )
        {
            src = document.createElement( "audio" );
            src.src = url;
        }
        else
        {
            src = url;
        }
        
        audio = this.context.createMediaElementSource( src );
        audio.connect( this.context.destination );
        audio.mediaElement.preservesPitch = false;
    }
    else
    {
        audio = {};
        audio.gain = this.context.createGain();
        audio.gain.connect( this.context.destination );

        fetch( url )
            .then( response => { return response.arrayBuffer(); } )
            .then( arrayBuffer => { this.context.decodeAudioData( arrayBuffer, function( buffer ) { audio.buffer = buffer } ); } );
    }
    
    audio.id = id;
    audio.lastStart = 0;

    // add to collection
    this.audioObjects[ id ] = audio;
    
    // if the level is running, store a reference for removal
    if ( App.state > App.STATE.HOME ) this.temporaries.push( audio );
}

/*
AudioHandler.prototype.loadBuffer = function ( src, audio )
{
    audio.gain = this.context.createGain();
    audio.gain.connect( this.context.destination );
    this.context.decodeAudioData( src, function( buffer ) { audio.buffer = buffer } );
};
*/

AudioHandler.prototype.play = function( id, loop = false, volume = 1, playbackRate = 1 )
{
    if ( this.context.state == "suspended" ) this.context.resume();
    
    // abort if id does not exist
    if ( !this.audioObjects[ id ] ) return;
    
    let currentTime = new Date().getTime();
    let audio = this.audioObjects[ id ];
    if ( currentTime - audio.lastStart < 200 ) return;
    
    audio.lastStart = currentTime;
    
    if( !this.app.isIOS )
    {
        audio.mediaElement.volume = volume;
        audio.mediaElement.loop = loop;
        audio.mediaElement.currentTime = 0;
        audio.mediaElement.playbackRate = playbackRate;
	audio.mediaElement.play();
    }
    else
    {        
        if ( audio.buffer )
        {
            if ( audio.source )
            {
                audio.source.disconnect();
                audio.source.stop(0);
                audio.source = null;
            }
            
            audio.source = this.context.createBufferSource();
            audio.source.buffer = audio.buffer;
           
            audio.gain.gain.value = volume;
            audio.source.loop = loop;
            audio.source.connect( audio.gain );
            audio.source.start ? audio.source.start(0) : audio.source.noteOn(0);
        }
        else
        {
            audio.autostart = true;
        }
    }
}

AudioHandler.prototype.stop = function( id )
{
    //console.log( id, this.audioObjects[id] )
    
    // abort if id does not exist
    if ( !this.audioObjects[ id ] ) return;
    
    var audio = this.audioObjects[ id ];
    
    if ( !this.app.isIOS )
    {
        audio.mediaElement.pause();
        audio.mediaElement.currentTime = 0;  
    } 
    else
    {
        if ( audio.source )
        {
            audio.source.disconnect();
            audio.source.stop(0);
            audio.source = null;
        }
    }
};

AudioHandler.prototype.setVolume = function( id, vol, time )
{
    // abort if id does not exist
    if ( !this.audioObjects[ id ] ) return;
    
    var audio = this.audioObjects[ id ];
    
    if ( time )
    {
        var targetVol = vol;
        
        if ( !this.app.isIOS )
        {
            gsap.to( audio.mediaElement, time, { ease: Linear.easeNone, volume: vol, onComplete: this.setVolume, onCompleteParams: [ id, targetVol ] } );
        }
        else
        {
            gsap.to( audio.gain.gain, time, { ease: Linear.easeNone, value: vol, onComplete: this.setVolume, onCompleteParams: [ id, targetVol ] } );
        }
    }
    else
    {
        if ( !this.app.isIOS )
        {
            audio.mediaElement.volume = vol;
            
            if ( vol == 0 )
            {
                audio.mediaElement.pause();
                audio.mediaElement.currentTime = 0;
            }
        } 
        else 
        {
            audio.gain.gain.value = vol;            
            if ( vol == 0 ) this.stop( audio.id );
        }
    }
};

AudioHandler.prototype.setAudioSourceVolume = function( id, vol )
{
    if ( !id ) return;
    
    var audio = this.audioObjects[ id ];

    if ( !this.app.isIOS )
    {
        audio.mediaElement.volume = vol;
    } 
    else 
    {
        audio.gain.gain.value = vol;
    }
};

AudioHandler.prototype.setPlaybackRate = function( id, playbackRate )
{
    if ( playbackRate < 0 ) return;
    
    var audio = this.audioObjects[ id ];
    
    if ( !this.app.isIOS )
    {
        audio.mediaElement.playbackRate = playbackRate;
    } 
}

// -------------------------------------------------------- DESTROY ----------------------------------------------------

AudioHandler.prototype.destroyTemporaries = function()
{
    // remove from temporaries
    for ( var i = 0; i < this.temporaries.length; i++ )
    {
        var audio = this.temporaries[i];
        
        // remove audio data
        if ( !this.app.isIOS )
        {
            audio.mediaElement.pause();
            audio.disconnect();
            
        } 
        else 
        {
            if ( audio.source ) { audio.source.disconnect(); audio.source.stop(); audio.source = null; }
            if ( audio.buffer ) { delete audio.buffer; audio.buffer = null; };
        }
        
        delete this.audioObjects[ audio.id ];
    }
    
    this.temporaries = [];
};

AudioHandler.prototype.remove = function( resourceId )
{
    var audio = this.audioObjects[ resourceId ];
    
    // remove audio data
    if ( this.app.isIOS )
    {
        if ( audio.source ) { audio.source.disconnect(); audio.source.stop(); audio.source = null; }
        if ( audio.buffer ) { delete audio.buffer; audio.buffer = null; };
    }
    else
    {
        audio.mediaElement.pause();
        audio.disconnect();
    }
    
    delete this.audioObjects[ resourceId ];
};