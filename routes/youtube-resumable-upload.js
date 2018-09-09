const express = require( 'express' );
const router = express.Router();
const googleauth = require( 'google-auth-cli' );
const ResumableUpload = require( 'node-youtube-resumable-upload' );
const GOOGLE_AUTH = require( '../google-apis/client-secret.json' ).web;
const UPLOAD_TOKEN_PATH = `${__dirname}/../google-apis/upload-tokens.json`;
const fs = require( 'fs' );
const { Progress } = require( 'express-progressbar' );

const cors = function ( req, res, next ) {
  res.setHeader( 'Access-Control-Allow-Origin', '*' );
  // res.header( 'Access-Control-Allow-Headers', 'X-Auth-Key');
  res.setHeader( 'Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE' );
  res.setHeader( 'X-Content-Type-Options', 'nosniff' );

  next();
};

router.use( cors );

var _token;
var hashes = {};

var upload = function ( hash ) {
  console.log( 'upload called' );
  // @todo: if ( !hash ) { throw; }
  if ( !hashes.hasOwnProperty( hash ) ) {
    hashes[hash] = {};
  }
  var ref = hashes[hash];

  var beginUploadWhenReady = new Promise( ( resolve, reject ) => {
    var interval = setInterval( () => {
      fs.readFile( `${__dirname}/../files/${hash}.json`, 'utf8', ( error, metaMetadata ) => {
        if ( !error && metaMetadata ) {
          clearInterval( interval );
        } else if ( !metaMetadata ) {
          clearInterval( interval );
          reject( 'metaMetadata is falsey', metaMetadata );
        }

        console.log( 'metaMetadata', metaMetadata );
        metaMetadata = JSON.parse( metaMetadata );

        ref.resumableUpload = new ResumableUpload(); //create new ResumableUpload
        ref.resumableUpload.tokens = _token;
        // ref.resumableUpload.filepath = `${__dirname}/../upload-test/sam-goodnight-big-brother.mp4`;
        ref.resumableUpload.filepath = `${__dirname}/../files/${hash}--extracted/${metaMetadata.video.path}`;
        ref.resumableUpload.metadata = {
          "snippet": {
            "title": new Date().toString(),
            "description": `Uploaded with ResumableUpload`
          },
          "status": {
            "privacyStatus": "private"
          }
        };
        ref.resumableUpload.monitor = true;
        ref.resumableUpload.retry  = -1;  //infinite retries, change to desired amount

        ref.resumableUpload.upload();
        resolve( ref );

        ref.resumableUpload.on( 'progress', function ( progress ) {
          ref.status = 'uploading';
          ref.data = progress;
          // console.log( 'progress', progress );
        } );

        ref.resumableUpload.on( 'error', function ( error ) {
          ref.status = 'error';
          ref.data = error;
          // console.log( 'error', error );
          reject( error );
        } );

        ref.resumableUpload.on( 'success', function ( success ) {
          ref.status = 'success';
          ref.data = success;
          console.log( 'success', success );
        } );

        console.log( 'ref', ref );
      } );
    }, 1000 );
  } );

  return beginUploadWhenReady;
}

var getToken = async function ( /* callback */ ) {
  console.log( 'getToken called' );

  return new Promise( ( resolve, reject ) => {
    var refreshToken = function () {
      googleauth(
        {
          "access_type": "offline",
          "scope": "https://www.googleapis.com/auth/youtube.upload" //can do just 'youtube', but 'youtube.upload' is more restrictive
        },
        {
          "client_id": GOOGLE_AUTH.client_id, //replace with your client_id and _secret
          "client_secret": GOOGLE_AUTH.client_secret,
          "timeout": 60 * 60 * 1000,  // This allows uploads to take up to an hour
          "port": 1920
        },
        function ( err, authClient, newToken ) {
          if ( !err ) {
            fs.writeFile( UPLOAD_TOKEN_PATH, JSON.stringify( newToken, null, 2 ), "utf8", function () {
              console.log( 'Token written to file.' );
            } );
            // callback( newToken );
            resolve( newToken );
          }
          return;
        }
      );
    };

    fs.readFile( UPLOAD_TOKEN_PATH, 'utf8', ( error, token ) => {
      console.log( `fs.readFile( ${UPLOAD_TOKEN_PATH} ) called` );
      if ( !error && ( token.trim() !== '' ) ) {
        fs.stat( UPLOAD_TOKEN_PATH, function ( error, stats ) {
          console.log( `fs.stat( ${UPLOAD_TOKEN_PATH} ) called` );
          if ( !error ) {
            /*{
              "access_token": "…",
              "expires_in": 3600,
              "scope": "https://www.googleapis.com/auth/youtube.upload",
              "token_type": "Bearer"
            }*/
            // console.log( 'token', token );
            token = JSON.parse( token );

            var now = Date.now();
            var mtime = Date.parse( stats.mtime );
            var tokenAge = now - mtime;
            var size = stats.size;
            var expirationDate = token.expires_in * 1000; /* seconds to milliseconds */

            if ( tokenAge >= expirationDate ) {
              refreshToken();
            } else {
              // callback( token );
              resolve( token );
            }
          } // if !error stat
          else {
            console.log( 'fs.stat error', error );
            refreshToken();
          }
        } ); // fs.stat
      } // if !error readFile
      else {
        if ( !error ) {
          console.log( 'token file was empty' );
          refreshToken( callback );
        } else {
          console.log( 'fs.readFile error', error );
          reject( error );
        }
      }
    } ); // readFile
  } );
};

function uploadToYouTube( hash ) {
  console.log( 'uploadToYouTube called' );

  var authenticatedUploadToYouTube = function ( token ) {
    console.log( 'authenticatedUploadToYouTube called' );
    console.log( 'token:\n' + JSON.stringify( token, null, 2 ) );
    _token = token;
    return upload( hash );
  };

  return getToken().then( authenticatedUploadToYouTube );
}

function reportUploadProgress( req, res ) {
  console.log( 'reportUploadProgress called' );

  if ( !req.params.hash ) { res.status( 400 ); }

  var hash = req.params.hash;
  var ref = hashes[hash];

  uploadToYouTube( hash )
    // YouTube Upload has started
    .then( ( ref ) => {
      /* update on progress */

      const progress = new Progress( res );
      let i = 0;
      let resumableUploadStarted = false;
      console.log( 'Waiting for ResumableUpload…' );
      byteLength = JSON.parse( fs.readFileSync( `${__dirname}/../files/${hash}.json` ) ).video.byteLength;
      const int = setInterval( () => {
        if ( ref && ref.status ) {
          if ( !resumableUploadStarted ) {
            console.log( 'ResumableUpload started…' );
            resumableUploadStarted = true;
          }
          if ( ( ref.status === 'error' ) || ( ref.status === 'success' ) ) {
            progress.close();
            clearInterval( int );
            console.log( 'progress closed' );
            res.status( ( ( ref.status === 'error' ) ? 500 : 200 ) );
          } else {
            let percentDone = ( ( ref.data / byteLength ) * 100 );
            progress.update( percentDone, ref.data );
            console.log( 'updated', percentDone, ref.data );
            i++;
          }
        } else if ( i >= 1000 ) {
          clearInterval( int );
          throw 'Upload progress timeout';
        }
      }, 2500 );
    } )
    .catch( ( error ) => {
      // Error
      console.log( 'YouTube upload error', error );
    } );
  // console.log( 'ref', ref );
}

// /progress/:hash
router.get( '/:hash', reportUploadProgress );

module.exports = {
  "router": router,
  "uploadToYouTube": uploadToYouTube,
  "reportUploadProgress": reportUploadProgress
};