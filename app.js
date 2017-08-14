var express        = require( 'express' );  
// var morgan         = require( 'morgan' );
var bodyParser     = require( 'body-parser' );  
var methodOverride = require( 'method-override' );  
var app            = express();  
var router         = express.Router();
var http           = require( 'http' );
// var xmlparser      = require( 'express-xml-bodyparser' );

const Logger = require( 'bug-killer' );

// External Routes
var youtubeVideos = require( './routes/youtube-videos' );
// var oauth2callback = require( './routes/oauth2callback' );
var videos = require( './routes/videos.js' );

router.use(function( req, res, next ) {  
  res.header( 'Access-Control-Allow-Origin', '*' );
  // res.header( 'Access-Control-Allow-Headers', 'X-Auth-Key');
  res.header( 'Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE' );

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

app.use( '/videos', videos.router );

app.use( '/youtube-videos', youtubeVideos );

// app.use( '/oauth2callback', oauth2callback );