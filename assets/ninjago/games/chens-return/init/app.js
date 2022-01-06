'use strict';

var App =
{
    STATE:
    {
        INIT:           0,
        INTRO:          1,
        HOME:           2,
        LOAD_LEVEL:     3,
        CREATE_LEVEL:   4,
        GAME_RUNNING:   5,
        DELETE_LEVEL:   6
    }
};
    
App.time = 0;
App.last = 0;
App.deltaTime = 0;
App.updatePhysics = false;
App.fps = 60;

App.debug = false;
App.debugLevel = 0;
App.useZipLoader = false;
App.version = "";
App.language = "en-us";

App.canvasScale = 1;
App.inverseCanvasScale = 1;
App.delayedFrames = 0;




App.init = function() // <editor-fold defaultstate="collapsed">
{    
    this.state = this.STATE.INIT;

    // get props
    this.stageH = window.innerHeight;
    this.stageW = Math.min( window.innerWidth, this.stageH );
    
    this.fscontainer = document.getElementById( "fscontainer" );
    this.stage = document.getElementById( "stage" );
    
    // mobile detection    
    this.isMobile = AppUtils.getNavigator();
    this.isIOS = ( /iPad|iPhone|iPod/.test( navigator.platform ) || ( navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 ) ) && !window.MSStream;
    if ( this.isIOS ) this.isMobile = true;

    // add listeners
    window.addEventListener( "resize", this.onResize.bind( this ) );
    
    // debug
    if ( this.debug )
    {
        this.debugBox = AppUtils.createElement( "div", "debugBox" );
        AppUtils.setProps( this.debugBox,
        {
           height: "200px"
        });
        this.fscontainer.append( this.debugBox );
    }
    
    // get locale data
    fetch( "init/locale.json" )
       .then( response => { return response.json(); } )
       .then( json => this.startLoading( json ) );
};
// </editor-fold>

App.startLoading = function( locale ) // <editor-fold defaultstate="collapsed">
{
    this.locale = locale;
    this.debug = locale.debug;
    this.debugLevel = parseInt( locale.debugLevel );
    this.useZipLoader = locale.useZipLoader;
    this.version = locale.version;

    // get language
    this.language = this.getLanguage();
    
    // preloadingScreen
    this.preloadingScreen = new PreloadingScreen( this );
    this.stage.append( this.preloadingScreen.display );
    
    // resize
    this.onResize();
    
    // zip loader
    this.loader = new Loader( { useZip: App.useZipLoader } );
    this.loader.addEventListener( "progress", this.onLoaderProgress.bind( this ) );
    this.loader.addEventListener( "complete", this.onLoaderComplete.bind( this ) );
    this.loader.load( "lang/" + App.language + "/home_intro" + App.version + ".zip" );
};
// </editor-fold>

App.onLoaderProgress = function( event ) // <editor-fold defaultstate="collapsed">
{
    if ( this.state === this.STATE.INIT )
    {
        this.preloadingScreen.onProgress( event.progress );
    }
    else if ( this.state === this.STATE.LOAD_LEVEL )
    {
        this.homescreen.onProgress( event.progress * 0.5 );
    }
    else if ( this.state === this.STATE.CREATE_LEVEL )
    {
        this.homescreen.onProgress( 0.5 + event.progress * 0.5 );
    }
};
// </editor-fold>

App.onLoaderComplete = function() // <editor-fold defaultstate="collapsed">
{
    if ( this.state === this.STATE.INIT )
    {
        this.initLoadedContents();
    }
    else
    {
        this.createLevel();
    }
};
// </editor-fold>

App.initLoadedContents = function() // <editor-fold defaultstate="collapsed">
{    
    // cookies
    this.cookie = new CookieHandler();
    //this.cookie.data.secondRun = true;

    // gsap
    gsap.registerPlugin( CustomEase );

    // audio handler
    this.audio = new AudioHandler( this );
    
    // create canvas
    this.canvas = document.createElement( 'canvas' );
    this.stage.append( this.canvas );
    
    // init zen3d
    this.renderer = new zen3d.Renderer( this.canvas, { antialias: true, alpha: false, stencil: true } );
    //this.renderer = new zen3d.Renderer( this.canvas, { contextType: "webgl", antialias: true, alpha: false, stencil: true } );
    
    // start update loop
    FT.resetTiming = true;    
    this.last = this.physicsLast = performance.now();
    this.onUpdate = this.onUpdate.bind( this );    
    requestAnimationFrame( this.onUpdate );
    
    // fullscreen handler    
    this.fullscreen = new FullscreenHandler( this );
    this.fscontainer.appendChild( this.fullscreen.display );
    
    // wait for first click to turn on audio and go fullscreen
    this.preloadingScreen.awaitInteraction();
    
    // init home or intro    
    if ( this.cookie.data.secondRun )
    {
        this.initHomeOrIntro( "home" );
    }
    else
    {
        this.initHomeOrIntro( "intro" );
    }
};
// </editor-fold>

App.onFullscreenChange = function( isFullscreen ) // <editor-fold defaultstate="collapsed">
{    
    if ( this.state === this.STATE.INIT )
    {
        // init home or intro    
        if ( this.cookie.data.secondRun )
        {
            setTimeout( this.initHomeOrIntro.bind( this ), 500, "home" );
        }
        else
        {
            setTimeout( this.initHomeOrIntro.bind( this ), 500, "intro" );
        }
    }

    if ( isFullscreen )
    {
        this.onResize();
    }
    else
    {
        if ( this.state === this.STATE.GAME_RUNNING )
        {
            this.level.hud.forcePause();
        }
        
        setTimeout( this.onResize.bind( this ), 1000 );
    }
};
// </editor-fold>

App.initHomeOrIntro = function( id = "home" ) // <editor-fold defaultstate="collapsed">
{    
    if ( id === "home" )
    {
        if ( !this.homescreen )
        {
            this.homescreen = new Homescreen( this );
            this.homescreen.addEventListener( "ready", this.onHomeReady.bind( this ) );
            this.homescreen.addEventListener( "start_level", this.startLevel.bind( this ) );
            this.homescreen.addEventListener( "show_intro", function() { App.initHomeOrIntro( "intro" ) } );
            this.audio.create( "home_music", this.loader.extract( "home/audio/home_music.ogg" ) );
        }
        else
        {
            this.startHome();
        }
    }
    else
    {
        if ( !this.intro )
        {
            this.intro = new Intro( this );
            this.intro.addEventListener( "ready", this.onIntroReady.bind( this ) );
            this.intro.addEventListener( "complete", function() { App.initHomeOrIntro( "home" ) } );
        }
        else
        {
            this.startIntro();
        }
    }
};
// </editor-fold>
    
App.onHomeReady = function() // <editor-fold defaultstate="collapsed">
{
    // add to stage
    this.stage.append( this.homescreen.display );
    
    if ( this.preloadingScreen.state === this.preloadingScreen.STATE.LOADING )
    {
        this.preloadingScreen.awaitInteraction();
    }
    else
    {
        this.startHome();
    }
};
// </editor-fold>

App.startHome = function() // <editor-fold defaultstate="collapsed">
{
    // resize
    this.state = this.STATE.HOME;
    this.onResize();
    
    if ( this.debug )
    {
        this.loadLevel( this.debugLevel );
        return;
    }
    
    //this.localStorage.data.maps[1].unlocked = true;
    
    this.homescreen.start();
    this.audio.play( "home_music", true );

    // hide preloadingScreen
    this.preloadingScreen.hide();
};
// </editor-fold>

App.onIntroReady = function() // <editor-fold defaultstate="collapsed">
{
    // add to stage
    this.stage.append( this.intro.display );
    
    if ( this.debug )
    {
        this.fullscreen.display.remove();
        this.loadLevel( this.debugLevel );
        return;
    }
    
    if ( this.preloadingScreen.state === this.preloadingScreen.STATE.LOADING )
    {
        this.preloadingScreen.awaitInteraction();
    }
    else
    {
        this.startIntro();
    }
};
// </editor-fold>

App.startIntro = function() // <editor-fold defaultstate="collapsed">
{
    // store secondrun
    this.cookie.data.secondRun = true;
    this.cookie.store();

    // resize
    this.state = this.STATE.INTRO;
    this.onResize();
    
    this.intro.start();
    this.audio.setVolume( "home_music", 0, 1 );
    
    // hide preloading screen
    this.preloadingScreen.hide();
};
// </editor-fold>

App.startLevel = function( event ) // <editor-fold defaultstate="collapsed">
{
    //this.audio.setVolume( "home_music", 0, 2 );
    setTimeout( this.loadLevel.bind( this ), 1000, event.data );
};
// </editor-fold>

App.loadLevel = function( id ) // <editor-fold defaultstate="collapsed">
{
    this.currentLevel = id;
    this.baseUrl = "level_" + id;
    this.state = this.STATE.LOAD_LEVEL;
    
    this.loader.clear();
    this.loader.load( "lang/" + this.language + "/" + this.baseUrl + this.version + ".zip" );
};
// </editor-fold>

App.createLevel = function() // <editor-fold defaultstate="collapsed">
{
    this.state = this.STATE.CREATE_LEVEL;
    
    // create level
    //this.level = new Level( this, this.loader.extract( "assets/level_1/_leveldata.json" ) );
    this.level = new Level( this, this.currentLevel );
};
// </editor-fold>

App.levelCreationComplete = function() // <editor-fold defaultstate="collapsed">
{
    this.canvas.style.visibility = "inherit";
    
    this.state = this.STATE.GAME_RUNNING;
    this.onResize();
    
    this.homescreen.hide();
    
    this.audio.setVolume( "home_music", 0, 1 );
    
    setTimeout( this.level.prepareStart.bind( this.level ), 500 );
};
// </editor-fold>

App.levelUnloadComplete = function( levelId ) // <editor-fold defaultstate="collapsed">
{
    this.level = undefined;
    
    // destroy level audio
    this.audio.destroyTemporaries();
    
    // show home
    this.homescreen.restart( levelId );
    
    // audio
    this.audio.play( "home_music", true );
    
    this.state = this.STATE.HOME;
};
// </editor-fold>

//---------------------------------------------------------------------------------------------------------------
//----------------------------------------------- UPDATE LOOP ---------------------------------------------------
//---------------------------------------------------------------------------------------------------------------

App.onUpdate = function( timestamp ) // <editor-fold defaultstate="collapsed">
{
    requestAnimationFrame( this.onUpdate );
    
    // deltaTime
    this.deltaTime = timestamp - this.last;
    this.last = timestamp;
    
    // measure performance and lower resolution
    if ( this.deltaTime > 20 )
    {
        this.delayedFrames++;
        
        if ( this.delayedFrames > 20 && this.canvasScale === 1 )
        {
            console.log( "switching to half resolution" );
            this.canvasScale = 2;
            this.inverseCanvasScale = 0.5;
            this.onResize();
        }
    }
    else
    {
        this.delayedFrames--;
        
        if ( this.delayedFrames < 10 && this.canvasScale === 2 )
        {
            console.log( "switching to full resolution" );
            this.canvasScale = 1;
            this.inverseCanvasScale = 1;
            this.onResize();
        }
    }
    
    // fix for severe performance hugs
    this.deltaTime = Math.min( this.deltaTime, 33 );

    // flashtween
    FT.onUpdate( this.deltaTime );

    // update elements
    
    if ( this.state === this.STATE.INTRO )
    {
        this.intro.onUpdate( this.deltaTime * 0.001 );
    }
    
    if ( this.state === this.STATE.GAME_RUNNING )
    {
        this.level.onUpdate( this.deltaTime * 0.001 );
    }
};
// </editor-fold>

App.onLowPerformanceUpdate = function( timestamp ) // <editor-fold defaultstate="collapsed">
{
    requestAnimationFrame( this.onUpdate );
    
    // deltaTime
    this.deltaTime = timestamp - this.last;
    this.last = timestamp;
    this.deltaTime = 32;
    
    this.updatePhysics = !this.updatePhysics;
    if ( this.updatePhysics )
    {
        if ( this.state === this.STATE.GAME_RUNNING )
        {
            if ( this.level.physicsNeedUpdate )
            {
                this.level.interleavedPhysicsUpdate( this.deltaTime * 0.001 );
            }
        }
        return;
    }  

    // flashtween    
    FT.onUpdate( this.deltaTime );

    // update elements
    if ( this.state === this.STATE.GAME_RUNNING )
    {
        this.level.onUpdate( this.deltaTime * 0.001 );
    }
};
// </editor-fold>

App.updateLocalStorage = function( tries, score = 0, standardBricks = 0, goldenBricks = 0, distance = 0  ) // <editor-fold defaultstate="collapsed">
{
    let map = this.cookie.data.maps[ this.level.levelId ];
    
    map.standard_bricks = Math.max( map.standard_bricks, standardBricks );
    map.golden_bricks = Math.max( map.golden_bricks, goldenBricks );
    map.distance = Math.max( map.distance, distance );
    map.tries = Math.max( map.tries, tries );
    
    let isNewRecord = false;
    
    if ( score > this.cookie.data.maps[ this.level.levelId ].score )
    {
        this.cookie.data.maps[ this.level.levelId ].score = score;
        isNewRecord = true;
    }
    
    // check level unlock
    if ( map.distance === 100 )
    {
        switch( this.level.levelId )
        {
            case 0:
                this.cookie.data.maps[ 1 ].unlocked = true;
            break;
            
            case 1:
                this.cookie.data.maps[ 2 ].unlocked = true;
            break;
            
            case 2:
                
                // enough golden bricks?
                if ( this.cookie.data.maps[ 0 ].golden_bricks + this.cookie.data.maps[ 1 ].golden_bricks + this.cookie.data.maps[ 1 ].goldenBricks > 6 )
                {
                    this.cookie.data.maps[ 3 ].unlocked = true;
                }
                
            break;
        }
    }

    // store
    this.cookie.store();
    
    // return record
    return isNewRecord;
};
// </editor-fold>

App.onResize = function() // <editor-fold defaultstate="collapsed">
{
    // get stage dimensions
    this.stageH = window.innerHeight;
    this.stageW = Math.min( window.innerWidth, this.stageH );
    
    // calculate aspect ratio    
    this.aspectRatio = this.stageW / this.stageH;
    
    if ( this.aspectRatio > 1 )
    {
        this.scale = this.stageH / 1080;
    }
    else
    {
        this.scale = this.stageW / 1080;
    }

    // stage
    this.stage.style.width = this.stageW + "px";
    this.stage.style.height = this.stageH + "px";
    this.stage.style.left = ( window.innerWidth - this.stageW ) * 0.5 + "px";
    
    // elements
    
    if ( this.state === this.STATE.INIT )
    {
        this.preloadingScreen.onResize();
        if ( this.fullscreen ) this.fullscreen.onResize();
    }
    else if ( this.state === this.STATE.INTRO )
    {
        // intro
        this.intro.onResize();
        
        // fullscreen
        this.fullscreen.onResize();
    }
    else if ( this.state > this.STATE.INTRO && this.state < this.STATE.GAME_RUNNING )
    {
        // homescreen
        this.homescreen.onResize();
        
        // fullscreen
        this.fullscreen.onResize();
    }
    else if ( this.state < this.STATE.DELETE_LEVEL )
    {
        // resize 3d viewport    
        this.canvas.width = this.stageW * this.inverseCanvasScale;
        this.canvas.height = this.stageH * this.inverseCanvasScale;
        this.canvas.style.transformOrigin = "0px 0px";
        this.canvas.style.transform = "scale( " + this.canvasScale + " )";
        this.renderer.backRenderTarget.width = this.canvas.width;
        this.renderer.backRenderTarget.height = this.canvas.height;
    
        // resize level    
        this.level.onResize();
        
        // fullscreen
        this.fullscreen.onResize();
    }
};
// </editor-fold>
    
App.getLanguage = function() // <editor-fold defaultstate="collapsed">
{
    let location = document.location.href;
    let language = "en-us";
    
    for ( let str in this.locale.privacy )
    {
        if ( location.indexOf( str ) != -1 )
        {
            language = str;
            break;
        }
    }
    
    return language;
}
// </editor-fold>

window.onload = App.init();