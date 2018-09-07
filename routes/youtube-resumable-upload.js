const googleauth = require( 'google-auth-cli' );
const ResumableUpload = require( 'node-youtube-resumable-upload' );
const GOOGLE_AUTH = require( '../google-apis/client-secret.json' ).web;

var tokens;

var upload = function () {
  var metadata = {
    "snippet": {
      "title": "Goodnight Big Brother",
      "description": "Uploaded with ResumableUpload"
    },
    "status": {
      "privacyStatus": "private"
    }
  };

  var resumableUpload = new ResumableUpload(); //create new ResumableUpload
  resumableUpload.tokens = tokens;
  resumableUpload.filepath = `${__dirname}/../upload-test/sam-goodnight-big-brother.mp4`;
  resumableUpload.metadata = metadata;
  resumableUpload.monitor = true;
  resumableUpload.retry  = -1;  //infinite retries, change to desired amount

  resumableUpload.upload();

  resumableUpload.on( 'progress', function ( progress ) {
    console.log( 'progress', progress );
  } );

  resumableUpload.on( 'error', function ( error ) {
    console.log( 'error', error );
  } );

  resumableUpload.on( 'success', function ( success ) {
   console.log( 'success', success );
  } );
}

var getTokens = function ( callback ) {
  googleauth(
    {
      "access_type": "offline",
      "scope": "https://www.googleapis.com/auth/youtube.upload" //can do just 'youtube', but 'youtube.upload' is more restrictive
    },
    {
      "client_id": GOOGLE_AUTH.client_id, //replace with your client_id and _secret
      "client_secret": GOOGLE_AUTH.client_secret,
      "timeout": 60 * 60 * 1000,  // This allows uploads to take up to an hour
      "port": 3000
    },
    function ( err, authClient, tokens ) {
      console.log( tokens );
      if ( tokens ) {
        callback( tokens );
      }
      return;
    }
  );
};

getTokens( function ( result ) {
  console.log( 'tokens:' + JSON.stringify( result ) );
  tokens = result;
  upload();
  return;
} );