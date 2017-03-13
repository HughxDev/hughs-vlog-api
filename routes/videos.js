var express = require( 'express' );
// var googleapis = require( 'googleapis' );
var router = express.Router();

const YouTube = require( 'youtube-api' );
const fs = require( 'fs' );
const Logger = require( 'bug-killer' );
const readJson = require( 'r-json' );
const opn = require( 'opn' );
const libxmljs = require( 'libxmljs' );

const CREDENTIALS = readJson( `${__dirname}/../credentials.json` );
const OVMLpath = `${__dirname}/../vlog.ovml`;

var tokensPath = `${__dirname}/../tokens.json`;

// let auth = YouTube.authenticate( {
//   type: "key",
//   key: "AIzaSyB4Tbn_ojseQFuK6mcR1ZiOB1KdV3PMn7g"
// } );

let oauth = YouTube.authenticate( {
  type: "oauth",
  client_id: CREDENTIALS.web.client_id,
  client_secret: CREDENTIALS.web.client_secret,
  redirect_url: CREDENTIALS.web.redirect_uris[0]
} );

function getVideos( res ) {
  var playlistItems = YouTube.playlistItems.list(
    {
      "part": "contentDetails",
      "playlistId": "PLP0y6Eq5YpfQ_1l9JClXpzx7cUyr453Zr"
    },
    ( playlistItemsError, playlistItems ) => {
    /*
      {
        kind: "youtube#playlistItemListResponse",
        etag: ""uQc-MPTsstrHkQcRXL3IWLmeNsM/jjzdpahjja1VbiPxfm7vHXF4Dk8"",
        nextPageToken: "CAUQAA",
        pageInfo: {
          totalResults: 23,
          resultsPerPage: 5
        },
        items: [
          {
            kind: "youtube#playlistItem",
            etag: ""uQc-MPTsstrHkQcRXL3IWLmeNsM/-RNuOWrzwweFqE4CqnKXvZD9Ots"",
            id: "UExQMHk2RXE1WXBmUV8xbDlKQ2xYcHp4N2NVeXI0NTNaci4yODlGNEE0NkRGMEEzMEQy",
            contentDetails: {
              videoId: "o5MaYhQZONY",
              videoPublishedAt: "2016-05-18T16:15:38.000Z"
            }
          },
          // ...   
        ]
      }
    */
      var videoIds = [];

      for ( var i = 0; i < playlistItems.items.length; i++ ) {
        videoIds.push( playlistItems.items[i].contentDetails.videoId );
      }

      var videos = YouTube.videos.list(
        {
          "part": "contentDetails,fileDetails,id,liveStreamingDetails,localizations,player,processingDetails,recordingDetails,snippet,statistics,status,topicDetails",
          "id": videoIds.join( ',' )
        },
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

function updateXML( res ) {
  var file = fs.readFile( OVMLpath, 'utf8', function ( error, data ) {
    // res.send(  data );
    var ovml = libxmljs.parseXmlString( data );

    // res.send(
    var node = ovml.root().find(
        '//ovml:video[1]',
        {
          ovml: 'http://vocab.nospoon.tv/ovml#'
        }
      )[0]
    ;

    node.addChild( new libxmljs.Element( ovml, 'element-name', 'text' ) );
    
    // res.setHeader( 'Content-Type', 'application/ovml+xml' );
    res.setHeader( 'Content-Type', 'application/xml' );
    res.send( ovml.toString() );
  } );
}

router.get( '/xml', function ( req, res, next ) {
  updateXML( res );
} );

router.get( '/', function ( req, res, next ) {
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
} );

router.get( '/oauth2callback', function ( req, res, next ) {
  oauth.getToken( req.query.code, ( error, tokens ) => {
    Logger.log( 'Trying to get the token using the following code: ' + req.query.code );

    if ( error ) {
      res.status( 400 ).send( error );
     
      return Logger.log( error );
    }

    Logger.log( 'Got the tokens.' );

    oauth.setCredentials( tokens );

    fs.writeFile( "tokens.json", JSON.stringify( tokens ), "utf8", function () {
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