var express = require( 'express' );
// var googleapis = require( 'googleapis' );
var router = express.Router();

const google = require( 'googleapis' );
const yt = google.youtube( 'v3' );

const YouTube = require( 'youtube-api' );
const fs = require( 'fs' );
const Logger = require( 'bug-killer' );
const readJson = require( 'r-json' );
const opn = require( 'opn' );
const libxmljs = require( 'libxmljs' );

const OVMLpath = `${__dirname}/../vlog.ovml`;
const tokensPath = `${__dirname}/../tokens.json`;

const GOOGLE_WEB_CLIENT_CREDENTIALS = readJson( `${__dirname}/../google-apis/web-client.json` );
const GOOGLE_SERVICE_ACCOUNT_CREDENTIALS = readJson( `${__dirname}/../google-apis/service-account.json` );

const GOOGLE_SIMPLE_AUTH = 0;
const GOOGLE_OAUTH = 1;
const GOOGLE_JWT_AUTH = 2;

const AUTH_TYPE = GOOGLE_JWT_AUTH;

var auth;

switch ( AUTH_TYPE ) {
  case GOOGLE_SIMPLE_AUTH:
    // new google.auth.???
    auth = YouTube.authenticate( {
      type: "key",
      key: "AIzaSyB4Tbn_ojseQFuK6mcR1ZiOB1KdV3PMn7g"
    } );
  break;

  case GOOGLE_OAUTH:
    // new google.auth.OAuth2(clientId, clientSecret, redirectUri, opt_opts) {}
    auth = YouTube.authenticate( {
      type: "oauth",
      client_id: GOOGLE_WEB_CLIENT_CREDENTIALS.web.client_id,
      client_secret: GOOGLE_WEB_CLIENT_CREDENTIALS.web.client_secret,
      redirect_url: GOOGLE_WEB_CLIENT_CREDENTIALS.web.redirect_uris[0]
    } );
  break;

  case GOOGLE_JWT_AUTH:
    auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_CREDENTIALS.client_email,
      null,
      GOOGLE_SERVICE_ACCOUNT_CREDENTIALS.private_key,
      [ "https://www.googleapis.com/auth/youtube" ],
      null
    );
  break;
}

function authorize( callback ) {
  auth.authorize( function ( error, tokens ) {
    if ( error ) {
      console.log( error );

      return;
    }

    // Make an authorized request
    callback();
  });
}

function getVideos( res ) {
  var playlistItems = yt.playlistItems.list(
    {
      "auth": auth,
      "part": "contentDetails",
      "playlistId": "PLP0y6Eq5YpfQ_1l9JClXpzx7cUyr453Zr",
      "maxResults": 50
    },
    ( playlistItemsError, playlistItems ) => {
      var videoIds = [];

      for ( var i = 0; i < playlistItems.items.length; i++ ) {
        videoIds.push( playlistItems.items[i].contentDetails.videoId );
      }

      var videosListOptions = {
        "auth": auth,
        "part": "contentDetails,fileDetails,id,liveStreamingDetails,localizations,player,processingDetails,recordingDetails,snippet,statistics,status,topicDetails",
        "id": videoIds.join( ',' )
        // "maxResults": 50
      };

      // fileDetails, processingDetails, and suggestions require User Auth
      /*
      "contentDetails": {
        "duration": "PT9M51S",
        "dimension": "2d",
        "definition": "hd",
        "caption": "false",
        "licensedContent": true,
        "projection": "rectangular",
        "hasCustomThumbnail": false
      },
      "processingDetails": {
        "processingStatus": "terminated"
      },
      */
      if ( AUTH_TYPE !== GOOGLE_OAUTH ) {
        videosListOptions.part = videosListOptions.part.replace( /(?:fileDetails|processingDetails|suggestions),?/g, '' );
      }

      var videos = yt.videos.list(
        videosListOptions,
        ( videosError, videos ) => {
          res.setHeader( 'Content-Type', 'application/json' );
          
          if ( videosError ) {
            res.status( 400 ).send( videosError );

            return Logger.log( videosError );
          }
          
          res.send( videos );
        }
      );
    }
  );
}

function getTokens() {
  opn( oauth.generateAuthUrl( {
    access_type: "offline",
    scope: [ "https://www.googleapis.com/auth/youtube" ]
  } ) );
}

if ( fs.existsSync( tokensPath ) ) {
  var TOKENS = readJson( tokensPath );
}

function tokensExist() {
  return ( fs.existsSync( tokensPath ) && TOKENS && ( 'expiry_date' in TOKENS ) );
}

// function updateXML( res ) {
//   var file = fs.readFile( OVMLpath, 'utf8', function ( error, data ) {
//     // res.send(  data );
//     var ovml = libxmljs.parseXmlString( data );

//     // res.send(
//     var node = ovml.root().find(
//         '//ovml:video[1]',
//         {
//           ovml: 'http://vocab.nospoon.tv/ovml#'
//         }
//       )[0]
//     ;

//     node.addChild( new libxmljs.Element( ovml, 'element-name', 'text' ) );
    
//     // res.setHeader( 'Content-Type', 'application/ovml+xml' );
//     res.setHeader( 'Content-Type', 'application/xml' );
//     res.send( ovml.toString() );
//   } );
// }

// /youtube-videos/xml
// router.get( '/xml', function ( req, res, next ) {
//   updateXML( res );
// } );

// /youtube-videos
router.get( '/', function ( req, res, next ) {
  if ( AUTH_TYPE === GOOGLE_OAUTH ) {
    if ( tokensExist() ) {
      if ( ( new Date() ) < ( new Date( TOKENS.expiry_date ) ) ) {
        oauth.setCredentials( TOKENS );

        Logger.log( 'Using saved tokens.' );

        getVideos( res );
        // next();
      } else {
        Logger.log( 'Saved tokens are expired; refreshing...' );

        getTokens();
      }
    } else {
      Logger.log( 'No saved tokens; obtaining...' );

      getTokens();
    }
  } else {
    authorize( function () {
      getVideos( res );
    } );
  }
} );

// /youtube-videos/oauth2callback
router.get( '/oauth2callback', function ( req, res, next ) {
  oauth.getToken( req.query.code, ( error, tokens ) => {
    Logger.log( 'Trying to get the token using the following code: ' + req.query.code );

    if ( error ) {
      res.status( 400 ).send( error );
     
      return Logger.log( error );
    }

    Logger.log( 'Got the tokens.' );

    oauth.setCredentials( tokens );

    fs.writeFile( "google-apis/tokens.json", JSON.stringify( tokens ), "utf8", function () {
      Logger.log( 'Tokens written to file.' );
    } );

    // res.end();

    // User ID: GPCcxdykgp6hgvL0XE3yaA
    // Channel ID: UCGPCcxdykgp6hgvL0XE3yaA
    // Playlist ID - Entire Series: PLP0y6Eq5YpfQ_1l9JClXpzx7cUyr453Zr

    getVideos( res );
  } );
} );

module.exports = router;