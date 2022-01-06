


function FullscreenHandler( app )
{    
    this.app = app;
    
    // create invisible    
    this.display = AppUtils.createElement( "div", "fullscreen_handler" );
    AppUtils.setProps( this.display,
    {
        width: "0px",
        height: "0px"
    });
    
    this.bg = AppUtils.createElement( "div", "bg" );
    AppUtils.setProps( this.bg,
    {
        width: this.app.stageW + "px",
        height: this.app.stageH + "px",
        backgroundColor: "#000",
        opacity: "0",
        cursor: "pointer"
    });

    this.legal_container = AppUtils.createElement( "div", "legal_container", "legal" );
    AppUtils.setProps( this.legal_container,
    {
        width: "0px",
        height: "0px",
        left: this.app.stageW * 0.5 + "px",
        top: this.app.stageH * 0.5 + "px"
    });
    
    // icon 
    this.clicker = AppUtils.createElement( "div", "clicker" );
    AppUtils.setProps( this.clicker,
    {
        width: "257px",
        height: "292px",
        display: "none",
        pointerEvents: "none",
        backgroundImage: "url(init/fs_click.png)",
        backgroundSize: "257px 292px"
    });
    
    this.privacy_button = AppUtils.createElement( "div", "privacy_button", "legal" );
    AppUtils.setProps( this.privacy_button,
    {
        position: "absolute",
        width: "250px",
        height: "30px",
        left: "-125px",
        top: "200px",
        paddingTop: "12px",
        fontFamily: "sans-serif",
        fontWeight: "bold",
        fontSize: "0.8em",
        color: "#FFF",
        textAlign: "center",
        backgroundColor: "#000",
        opacity: "0.6",
        cursor: "pointer"
    });
    this.privacy_button.textContent = this.app.locale.privacy[ this.app.language ].label;
    
    this.cookie_button = AppUtils.createElement( "div", "cookie_button", "legal" );
    AppUtils.setProps( this.cookie_button,
    {
        position: "absolute",
        width: "250px",
        height: "30px",
        left: "-125px",
        top: "244px",
        paddingTop: "12px",
        fontFamily: "sans-serif",
        fontWeight: "bold",
        fontSize: "0.8em",
        color: "#FFF",
        textAlign: "center",
        backgroundColor: "#000",
        opacity: "0.6",
        cursor: "pointer"
    });
    this.cookie_button.textContent = this.app.locale.cookies[ this.app.language ].label;
    
    this.legal_container.appendChild( this.privacy_button );
    this.legal_container.appendChild( this.cookie_button );
    this.legal_container.appendChild( this.clicker );
    
    this.display.appendChild( this.bg );
    this.display.appendChild( this.legal_container );
    
    this.onResize();

    // add listeners
    
    this.bg.addEventListener( "click", this.onRequestFullscreen.bind( this ), false );
    this.cookie_button.addEventListener( "click", this.onLegalClick.bind( this ), false );
    this.privacy_button.addEventListener( "click", this.onLegalClick.bind( this ), false );

    if ( !this.app.isMobile )
    {
        this.cookie_button.addEventListener( "mouseover", this.onLegalOver.bind( this ), false );
        this.cookie_button.addEventListener( "mouseout", this.onLegalOut.bind( this ), false );
        this.privacy_button.addEventListener( "mouseover", this.onLegalOver.bind( this ), false );
        this.privacy_button.addEventListener( "mouseout", this.onLegalOut.bind( this ), false );
    };

    if ( document.documentElement.requestFullscreen )
    {
        document.addEventListener( "fullscreenchange", this.onFullscreenChange.bind( this ) );
    }
    else
    {
        document.addEventListener( "webkitfullscreenchange", this.onFullscreenChange.bind( this ) );
    };
    
    if ( !App.locale.showPolicies )
    {
        this.privacy_button.style.display = "none";
        this.cookie_button.style.display = "none";
    }
}

FullscreenHandler.prototype.onTouchPrevent = function( e )
{
    e.preventDefault();
}

FullscreenHandler.prototype.onRequestFullscreen = function( e )
{    
    // hide
    this.display.style.display = "none";
    
    // check if fullscreen is allowed
    if ( !App.locale.allowFullscreen )
    {
        App.onFullscreenChange( true );
        return;
    }

    // request fullscreen
    // but not for apple, as pinch to zoom breaks the input mechanics

    if ( !App.isIOS )
    {
        // fullscreen code
        if ( document.documentElement.requestFullscreen )
        {
            App.fscontainer.requestFullscreen();
        }
        else if ( document.documentElement.webkitRequestFullScreen )
        {
            App.fscontainer.webkitRequestFullScreen();
        }
        
        App.isFullscreen = true;
    }
    else
    {
        App.onFullscreenChange( true );
    }
   
    //App.onFullscreenChange( true );

    // set orientation lock
    
    if ( App.isMobile )
    {
        if ( !App.isIOS )
        {
            screen.orientation.lock( "portrait-primary" ).catch( function( error )
            {
                console.log( error );
            });
        }
    }
}

FullscreenHandler.prototype.onFullscreenChange = function( e )
{    
    if( document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement )
    {
        // hide
        this.display.style.display = "none";

        // callback
        App.onFullscreenChange( true );
    }
    else
    {
        // show
        this.display.style.display = "inline";
        this.clicker.style.display = "inline";
        this.bg.style.opacity = "0.7";

        // callback
        App.onFullscreenChange( false );
    }
}

FullscreenHandler.prototype.onLegalOver = function( event )
{
    event.target.style.opacity = "1";
}

FullscreenHandler.prototype.onLegalOut = function( event )
{
    event.target.style.opacity = "0.6";
}

FullscreenHandler.prototype.onLegalClick = function( event )
{
    if ( event.target === this.cookie_button )
    {
        window.open( this.app.locale.cookies[ this.app.language ].link );
    }
    else
    {
        window.open( this.app.locale.privacy[ this.app.language ].link );
    }
}

FullscreenHandler.prototype.onResize = function()
{
    let stageW = window.innerWidth;
    let stageH = window.innerHeight;
    
    AppUtils.setProps( this.bg,
    {
        width: stageW + "px",
        height: stageH + "px"
    });
    
    AppUtils.setProps( this.legal_container,
    {
        left: stageW * 0.5 + "px",
        top: stageH * 0.5 + "px"
    });

    AppUtils.setProps( this.clicker,
    {
        left: ( - 257 * App.scale * 0.5 ) + "px",
        top: ( - 350 * App.scale * 0.5 ) + "px",
        transform: "scale( " + App.scale + " )"
    });
}