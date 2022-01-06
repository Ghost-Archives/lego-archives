'use strict';

function Homescreen( app ) // <editor-fold defaultstate="collapsed">
{
    // props
    this.app = app;
    this.STATE =
    {
        INTRO:                  0,
        INTRO_MOVIE:            1,
        LEVEL_SELECT:           2,
        LOADING:                3,
        LEVEL_RUNNING:          4
    };
    
    this.state = this.STATE.INTRO;
    this.currentLevelScreen = 0;
    
    // create display
    FT.create( this.app.loader.extract( "home/home.json" ), this.app.loader.extract( "home/home.png" ), this.init.bind( this ) );
};
// </editor-fold>

Homescreen.prototype.init = function( ft ) // <editor-fold defaultstate="collapsed">
{
    this.ft = ft;
    this.display = ft.display;
    this.display.id = "Homescreen";
    let that = this;

    // start button
    this.button_start = this.ft._INTRO.Start_Button;
    this.button_start.display.style.cursor = "pointer";
    this.button_start.display.addEventListener( "click", function() { that.onClick( that.button_start ) } );
    
    // intro button
    this.button_intro = this.ft._INTRO.button_intro;
    this.button_intro.display.style.cursor = "pointer";
    this.button_intro.display.addEventListener( "mouseover", function() { that.onOver( that.button_intro ) } );
    this.button_intro.display.addEventListener( "mouseout", function() { that.onOut( that.button_intro ) } );
    this.button_intro.display.addEventListener( "click", function() { that.onClick( that.button_intro ) } );
    
    // button_prev & next
    this.button_prev = this.ft._LEVEL_SELECT.button_prev;
    this.button_prev.display.style.cursor = "pointer";
    this.button_prev.display.addEventListener( "click", function() { that.onClick( that.button_prev ) } );

    this.button_next = this.ft._LEVEL_SELECT.button_next;
    this.button_next.display.style.cursor = "pointer";
    this.button_next.display.addEventListener( "click", function() { that.onClick( that.button_next ) } );

    this.loading_bar = this.ft._LEVEL_SELECT.loading_bar;
    AppUtils.setMouseChildren( this.loading_bar.display, false );
    
    // button sound
    this.button_pressed_sound = this.app.audio.create( "button_press", this.app.loader.extract( "home/audio/button_press.ogg" ) );
    
    // ready    
    this.dispatchEvent( "ready" );
}
// </editor-fold>

Homescreen.prototype.start = function() // <editor-fold defaultstate="collapsed">
{
    this.ft.enabled = true;
    this.ft.gotoAndStop( 1 );
    this.ft._INTRO.gotoAndPlay( 0 );
    
    this.ft.alpha = 1;
    this.display.style.visibility = "inherit";
};
// </editor-fold>

Homescreen.prototype.restart = function( preselectLevel = 0 ) // <editor-fold defaultstate="collapsed">
{
    this.ft.enabled = true;
    
    this.initLevelScreens();
    
    this.display.style.visibility = "inherit";
    gsap.to( this.ft, 0.5, { ease: Linear.easeNone, alpha: 1 } );
    
    if ( preselectLevel >= 3 ) return;

    // goto next level screen if unlocked & released
    let mapData = this.app.cookie.data.maps[ preselectLevel + 1 ];
    let that = this;

    if ( mapData.unlocked && mapData.released )
    {
        setTimeout( this.onClick.bind( this ), 1000, that.button_next );
    }
};
// </editor-fold>

Homescreen.prototype.restartDelayed = function() // <editor-fold defaultstate="collapsed">
{
    this.ft.play();
};
// </editor-fold>

Homescreen.prototype.onOver = function( target ) // <editor-fold defaultstate="collapsed">
{
    target.gotoAndPlay( "OVER" );
};
// </editor-fold>

Homescreen.prototype.onOut = function( target ) // <editor-fold defaultstate="collapsed">
{
    target.gotoAndPlay( "OUT" );
};
// </editor-fold>

Homescreen.prototype.onClick = function( target ) // <editor-fold defaultstate="collapsed">
{
    if ( this.state === this.STATE.LOADING ) return;
    
    this.app.audio.play( "button_press" );
    
    if ( target === this.button_start )
    {
        this.setState( this.STATE.LEVEL_SELECT );
    }
    else if ( target === this.button_prev )
    {
        if ( this.currentLevelScreen === 0 )
        {
            this.setState( this.STATE.INTRO );
        }
        else
        {
            this.currentLevelScreen--;
            this.moveLevelScreens();
        }
    }
    else if ( target === this.button_next )
    {
        this.currentLevelScreen++;
        this.moveLevelScreens();
    }
    else if ( target === this.button_intro )
    {
        this.setState( this.STATE.INTRO_MOVIE );
    }
    else
    {
        for ( let i = 0; i < this.level_start_buttons.length; i++ )
        {
            if ( target === this.level_start_buttons[i] )
            {
                this.setState( this.STATE.LOADING );
                break;
            }
        }
    }
};
// </editor-fold>

Homescreen.prototype.setState = function( state ) // <editor-fold defaultstate="collapsed">
{
    switch( state )
    {
        case this.STATE.INTRO:
            
            gsap.to( this.ft._INTRO, 0.5, { ease: Quad.easeInOut, x: 0 } );
            gsap.to( this.ft._LEVEL_SELECT, 0.5, { ease: Quad.easeInOut, x: 1920 } );
            
            for ( let i = 0; i < this.level_start_buttons.length; i++ )
            {
                this.level_start_buttons[i].gotoAndStop( 1 );
            }
            
        break;
        
        case this.STATE.INTRO_MOVIE:
            
            gsap.to( this.ft, 0.5, { ease: Linear.easeNone, alpha: 0 } );
            this.dispatchEvent( "show_intro" );
            
        break;
        
        case this.STATE.LEVEL_SELECT:

            this.currentLevelScreen = 0;
            this.initLevelScreens();
            
            gsap.to( this.ft._INTRO, 0.5, { ease: Quad.easeInOut, x: -1920 } );
            gsap.to( this.ft._LEVEL_SELECT, 0.5, { ease: Quad.easeInOut, x: 0, onComplete: this.fadeinLevelStartButton.bind( this ) } );

        break;
        
        case this.STATE.LOADING:
            
            gsap.to( this.loading_bar, 0.5, { ease: Linear.easeNone, alpha: 1, delay: 0.3 } );
            gsap.to( this.level_screens[ this.currentLevelScreen ].display.children[9], 0.3, { ease: Quad.easeInOut, x: -540, y: -960, scaleX: 1.8, scaleY: 1.92 } );
            this.dispatchEvent( "start_level", this.currentLevelScreen );
            
        break;
    }
    
    this.state = state;
};
// </editor-fold>

Homescreen.prototype.fadeinLevelStartButton = function() // <editor-fold defaultstate="collapsed">
{
    let screen = this.level_screens[ this.currentLevelScreen ];
    
    if ( screen.level_start_button.timeline.current === 1 )
    {
        screen.level_start_button.gotoAndPlay( 1 );
    }
};
// </editor-fold>

Homescreen.prototype.initLevelScreens = function() // <editor-fold defaultstate="collapsed">
{
    // reset loading_bar
    this.loading_bar.alpha = 0;
    this.loading_bar.loading_bar_progress.scaleX = 0;

    // level screens
    let i = 0;
    let screen;
    let data = this.app.cookie.data;
    this.level_screens = [];
    this.level_start_buttons = [];
    
    for ( i; i < data.maps.length; i++ )
    {
        screen = this.ft._LEVEL_SELECT[ "level_screen_" + i ];
        screen.x = 1920 * ( i - this.currentLevelScreen );
        this.level_screens.push( screen );
        this.level_start_buttons.push( screen.level_start_button );
        
        // level preview image
        gsap.set( screen.display.children[9], { x: -330, y: -580, scaleX: 1.1, scaleY: 1.1 } );

        // setup level screen contents
        if ( data.maps[i].unlocked && data.maps[i].released )
        {
            let id = i;
            let that = this;

            // start button
            screen.level_start_button.gotoAndStop( 1 );
            
            // mouse listener
            if ( !screen.display.hasEventListener )
            {
                screen.display.addEventListener( "click", function() { that.onClick( that.level_start_buttons[id] ) } );
                screen.display.style.cursor = "pointer";
                screen.display.hasEventListener = true;
            }
        }
        else
        {
            screen.level_start_button.gotoAndStop( 0 );
        }
        
        this.setupLevelScore( screen.level_score, data.maps[i] );
    }
};
// </editor-fold>

Homescreen.prototype.moveLevelScreens = function() // <editor-fold defaultstate="collapsed">
{
    // change current
    this.currentLevelScreen = Math.min( this.currentLevelScreen, this.app.cookie.data.maps.length - 1 );
    this.currentLevelScreen = Math.max( this.currentLevelScreen, 0 );
    
    // setup start button
    let screen = this.level_screens[ this.currentLevelScreen ];
    let data = this.app.cookie.data.maps[this.currentLevelScreen];

    if ( !data.unlocked || !data.released )
    {
        screen.level_start_button.gotoAndStop( 0 );
    }
    else
    {
        screen.level_start_button.gotoAndStop( 1 );
    }
    
    // translate screens
    let i = 0;
    for ( i; i < this.level_screens.length; i++ )
    {
        gsap.to( this.level_screens[i], 0.3, { ease: Quad.easeInOut, x: ( i - this.currentLevelScreen ) * 1920, onComplete: this.fadeinLevelStartButton.bind( this ) } );
    };
    
    // next button
    this.button_next.visible = ( this.currentLevelScreen !== this.app.cookie.data.maps.length - 1 );
};
// </editor-fold>

Homescreen.prototype.onProgress = function( progress ) // <editor-fold defaultstate="collapsed">
{
    if ( this.state !== this.STATE.LOADING ) return;
    this.loading_bar.loading_bar_progress.scaleX = progress;
};
// </editor-fold>

Homescreen.prototype.hide = function() // <editor-fold defaultstate="collapsed">
{
    gsap.to( this.ft, 0.5, { ease: Linear.easeNone, alpha: 0, onComplete: this.hideComplete.bind( this ) } );
};
// </editor-fold>

Homescreen.prototype.hideComplete = function() // <editor-fold defaultstate="collapsed">
{
    this.ft.enabled = false;
    this.display.style.visibility = "hidden";
    this.state = this.STATE.LEVEL_RUNNING;
};
// </editor-fold>

Homescreen.prototype.addEventListener = function( eventType, callback ) // <editor-fold defaultstate="collapsed">
{
    if ( !this.hasOwnProperty( eventType ) ) this[eventType] = [];
    this[eventType].push( callback );
};
// </editor-fold>

Homescreen.prototype.dispatchEvent = function( eventType, eventData )
{
    if ( !this.hasOwnProperty( eventType ) ) return;
    
    for ( let i = 0; i < this[eventType].length; i++ )
    {
        this[eventType][i]( { type: eventType, data: eventData } );
    }
};
// </editor-fold>

Homescreen.prototype.onResize = function() // <editor-fold defaultstate="collapsed">
{
    if ( this.state === this.STATE.LEVEL_RUNNING ) return;
    
    let scale = 1;
    let halfW = this.app.stageW * 0.5;
    let halfH = this.app.stageH * 0.5;
    
    if ( this.app.aspectRatio < 0.5625 )
    {
        scale = this.app.stageW / 1080;
    }
    else
    {
        scale = this.app.stageH / 1920;
    }
    
    // main display
    this.display.style.transform = "scale( " + scale + ")";
    this.display.style.left = halfW + "px";
    this.display.style.top = halfH + "px";
    
    if ( this.state === this.STATE.INTRO ) return;
    
    // button_prev
    let posX = Math.max( ( halfW - 80 ) / scale, 460 );
    
    this.button_prev.x = -posX;
    this.button_next.x = posX;
};
// </editor-fold>

Homescreen.prototype.setupLevelScore = function( node, mapData ) // <editor-fold defaultstate="collapsed">
{
    let one = 0;
    let ten = 0;
    let hundred = 0;
    let thousand = 0;

    if ( mapData.score > 0 )
    {
        // distance
        one = mapData.distance % 10;
        ten = Math.floor( mapData.distance * 0.1 ) % 10;
        hundred = Math.floor( mapData.distance * 0.01 ) % 10;
        
        node.level_distance_digits.digit_1.gotoAndStop( hundred );
        node.level_distance_digits.digit_2.gotoAndStop( ten );
        node.level_distance_digits.digit_3.gotoAndStop( one );
        
        node.level_distance_digits.width = 180;
        node.level_distance_digits.height = 66;
        node.level_distance_digits.display.style.overflow = "hidden";
        
        // score        
        one = mapData.score % 10;
        ten = Math.floor( mapData.score * 0.1 ) % 10;
        hundred = Math.floor( mapData.score * 0.01 ) % 10;
        thousand = Math.floor( mapData.score * 0.001 ) % 10;

        node.level_score_digits.digit_1.gotoAndStop( thousand );
        node.level_score_digits.digit_2.gotoAndStop( hundred );
        node.level_score_digits.digit_3.gotoAndStop( ten );
        node.level_score_digits.digit_4.gotoAndStop( one );

        node.level_score_digits.width = 220;
        node.level_score_digits.height = 66;
        node.level_score_digits.display.style.overflow = "hidden";
        
        // golden bricks        
        node.level_golden_brick_digits.digit_1.gotoAndStop( mapData.golden_bricks );
        node.level_golden_brick_digits.digit_2.gotoAndStop( 5 );

        node.level_golden_brick_digits.width = 120;
        node.level_golden_brick_digits.height = 66;
        node.level_golden_brick_digits.display.style.overflow = "hidden";        

        // set visible
        node.visible = true;
    }
    else
    {
        node.visible = false;
    }
};
// </editor-fold>
