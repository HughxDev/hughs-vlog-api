require('epipebomb')();

var express        = require( 'express' );
// var morgan         = require( 'morgan' );
var bodyParser     = require( 'body-parser' );
var methodOverride = require( 'method-override' );
var app            = express();
var router         = express.Router();
var http           = require( 'http' );
// var xmlparser      = require( 'express-xml-bodyparser' );

const Logger = require( 'bug-killer' );

const decompress = require( 'decompress' );
const decompressTarxz = require( 'decompress-tarxz' );

// External Routes
var thirdParty = require( './routes/third-party' );
// var oauth2callback = require( './routes/oauth2callback' );
var videos = require( './routes/videos.js' );
var uploads = require( './routes/uploads.js' );

// --- Tus ---
const tus = require( 'tus-node-server' );
const server = new tus.Server();

server.datastore = new tus.FileStore( {
  path: '/files'
} );

/*
  EVENT_FILE_CREATED: Fired when a POST request successfully creates a new file
  Example payload:
  {
      file: {
          id: '7b26bf4d22cf7198d3b3706bf0379794',
          upload_length: '41767441',
          upload_metadata: 'filename NDFfbWIubXA0'
       }
  }

  EVENT_ENDPOINT_CREATED: Fired when a POST request successfully creates a new upload endpoint
  Example payload:
  {
      url: 'http://localhost:1080/files/7b26bf4d22cf7198d3b3706bf0379794'
  }

  EVENT_UPLOAD_COMPLETE: Fired when a PATCH request finishes writing the file
  Example payload:
  {
      file: {
          id: '7b26bf4d22cf7198d3b3706bf0379794',
          upload_length: '41767441',
          upload_metadata: 'filename NDFfbWIubXA0'
      }
  }
*/
// https://github.com/tus/tus-node-server/issues/104
/**
 * Parses the Base64 encoded metadata received from the client.
 *
 * @param  {String} metadata_string tus' standard upload metadata
 * @return {Object}                 metadata as key-value pair
 */
function _parseMetadataString(metadata_string) {
    const kv_pair_list = metadata_string.split(',');
     return kv_pair_list.reduce((metadata, kv_pair) => {
        const [key, base64_value] = kv_pair.split(' ');
         metadata[key] = {
            encoded: base64_value,
            decoded: Buffer.from(base64_value, 'base64').toString('ascii'),
        };
         return metadata;
    }, {});
}

server.on( tus.EVENTS.EVENT_UPLOAD_COMPLETE, ( event ) => {
  console.log( `Upload complete for file ${event.file.id}` );

  var file = _parseMetadataString( event.file.upload_metadata );

  if ( file.filename.decoded.match( /\.redblue$/i ) ) {
    decompress( `./files/${event.file.id}`, `./files/${event.file.id}--extracted/`, {
      "plugins": [
        decompressTarxz()
      ]
    } ).then( ( files ) => {
      console.log( 'Files decompressed:' );
      console.log( files );
    } );
  }
} );

// const app = express();
const uploadApp = express();

uploadApp.use(function( req, res, next ) {
  res.setHeader( 'Access-Control-Allow-Origin', '*' );
  // res.header( 'Access-Control-Allow-Headers', 'X-Auth-Key');
  res.setHeader( 'Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE' );
  res.setHeader( 'X-Content-Type-Options', 'nosniff' );

  next();
});

uploadApp.all( '*', server.handle.bind( server ) );
app.use( '/uploads', uploadApp );

const host = '127.0.0.1';
const port = 1080;
app.listen( port, host );
// --- End Tus ---

process.stdout.on( 'error', function ( err ) {
  // if ( err.code == "EPIPE" ) {
  process.exit(0);
  // }
} );

router.use(function( req, res, next ) {
  res.setHeader( 'Access-Control-Allow-Origin', '*' );
  // res.header( 'Access-Control-Allow-Headers', 'X-Auth-Key');
  res.setHeader( 'Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE' );
  res.setHeader( 'X-Content-Type-Options', 'nosniff' );

  next();
});

app.use( '/', router );

app.use( bodyParser.text({
  // "type": "application/xml"
  "type": "*/*"
}) );
// app.use( xmlparser() );

app.set( 'port', process.env.PORT || 3000 );

app.listen( app.get( 'port' ), function () {
  console.log( 'Express up and listening on port ' + app.get('port') );
} );

// Routes
app.route( '/' )
  .options( function ( req, res, next ) {
    res.status( 200 ).end();

    next();
  } )
  .get( function ( req, res ) {
    res.send( 'hello' );
  } )
; // /

app.route( '/oembed' )
  .get( function ( req, res ) {
    // http://www.youtube.com/oembed?url=' + encodeURIComponent( url ) + '&format=xml'
    var url = req.query.url; // .replace( /https?:\/\//, '' );

    var options = {
      host: 'www.youtube.com',
      port: '80',
      path: '/oembed?url=' + encodeURIComponent( url ) + '&format=json',
      method: 'GET',
      // headers: {
      //   'Content-Type': 'application/x-www-form-urlencoded',
      //   'Content-Length': post_data.length
      // }
    };

    // console.log( url );

    var oembedReq = http.request( options, function( oembedRes ) {
      var body = '';

      oembedRes.on( 'data', function( chunk ) {
        body += chunk;
      } );

      oembedRes.on( 'end', function() {
        res.setHeader( 'Content-Type', 'application/json' );
        res.send( body );
      } );
    } );

    // write the request parameters
    // oembedReq.write( 'url=' + encodeURIComponent( url ) + '&format=json' );

    oembedReq.end();
  } )
; // /oembed

app.route( '/upload' )
; // upload

app.route( '/search' )
; // search

app.use( '/files', uploads );

app.use( '/feed', videos.router );

app.use( '/third-party', thirdParty );

// app.use( '/oauth2callback', oauth2callback );
