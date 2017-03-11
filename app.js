var express        = require( 'express' );  
// var morgan         = require( 'morgan' );
var bodyParser     = require( 'body-parser' );  
var methodOverride = require( 'method-override' );  
var app            = express();  
var router         = express.Router();
var http           = require( 'http' );

router.use(function( req, res, next ) {  
  res.header( 'Access-Control-Allow-Origin', '*' );

  next();
});

app.set( 'port', process.env.PORT || 3000 );

app.listen( app.get( 'port' ), function () {  
  console.log( 'Express up and listening on port ' + app.get('port') );
} );

app.route( '/' )
  .options( function ( req, res, next ) {
    res.status( 200 ).end();

    next();
  } )
  .get( function ( req, res ) {
    res.send( 'hello' );
  } )
;

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
;