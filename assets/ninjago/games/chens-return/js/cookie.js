'use strict';


/* global App */



function CookieHandler()
{
    this.cname = "Ninjago_Legacy_Game_2021";
    this.exdays = 168;
    this.data = null;
    
    this.load();
};

CookieHandler.prototype.load = function()
{
    if ( App.locale.useCookie )
    {
        let name = this.cname + "=";
        let decodedCookie = decodeURIComponent( document.cookie );
        let ca = decodedCookie.split( ";" );

        let i = 0;
        let len = ca.length;
        let c;

        for( i; i < len; i++ )
        {
            c = ca[i];

            while ( c.charAt( 0 ) === " " )
            {
                c = c.substring( 1 );
            }
            if ( c.indexOf( name ) === 0 ) 
            {
                this.data = JSON.parse( c.substring( name.length, c.length ) );
            }
        }
    }
    else
    {
        this.data = window.localStorage.getItem( this.cname );
        this.data = JSON.parse( this.data );
    }
    
    if ( !this.data )
    {
        this.data = new CookieData();
        this.store();
    }
    else
    {
        this.updateReleaseData();
    }
};

CookieHandler.prototype.updateReleaseData = function()
{
    for ( let i = 0; i < 4; i++ )
    {
        this.data.maps[i].released = true;
    }
};

CookieHandler.prototype.store = function()
{
    let data = JSON.stringify( this.data );
    
    if ( App.locale.useCookie )
    {
        let d = new Date();
        d.setTime( d.getTime() + ( this.exdays*24*60*60*1000 ) );
        let expires	= "expires=" + d.toUTCString();
        document.cookie = this.cname + "=" + data + ";" + expires + ";path=/";
    }
    else
    {
        window.localStorage.setItem( this.cname, data );
    }
};

CookieHandler.prototype.remove = function()
{
    if ( App.locale.useCookie )
    {
        let d = new Date();
        let expires	= "expires="+ d.toUTCString();
        document.cookie = this.cname + "=;" + expires + ";path=/";
    }
    else
    {
        window.localStorage.removeItem( this.cname );
    }
    
    this.data = null;
};

function CookieData()
{
    this.maps = 
    [
        {
            id: 0,
            name: "Crashcourse Canyon",
            score: 0,
            standard_bricks: 0,
            golden_bricks: 0,
            distance: 0,
            tries: 0,
            unlocked: true,
            released: true
        },
        {
            id: 1,
            name: "Jankikai Jungle",
            score: 0,
            standard_bricks: 0,
            golden_bricks: 0,
            distance: 0,
            tries: 0,
            unlocked: false,
            released: true
        },
        {
            id: 2,
            name: "Glacier Barrens",
            score: 0,
            standard_bricks: 0,
            golden_bricks: 0,
            distance: 0,
            tries: 0,
            unlocked: false,
            released: true
        },
        {
            id: 3,
            name: "Ninjago City",
            score: 0,
            standard_bricks: 0,
            golden_bricks: 0,
            distance: 0,
            tries: 0,
            unlocked: false,
            released: true
        }
    ];
};