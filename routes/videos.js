var express = require( 'express' );
var router = express.Router();
var basex  = require( 'basex' );
var fs = require( 'fs' );

const NS = {
  "ovml": "http://vocab.nospoon.tv/ovml#",
  "xlink": "http://www.w3.org/1999/xlink",
  "html": "http://www.w3.org/1999/xhtml",
  "mathml": "http://www.w3.org/1998/Math/MathML",
  "svg": "http://www.w3.org/2000/svg",
  "oembed": "http://oembed.com/"
};

var client = new basex.Session( 'localhost', 1984, 'admin', 'admin' );

basex.debug_mode = false;

// /videos
router.get( '/', function ( req, res, next ) {
  // var mode = 'json';
  var mode = 'xml';
  // var query=session.query(query)
  // var statement = 'for $i in 1 to 100 return <xml>Text { $i }</xml>';
  var statement = fs.readFileSync( 'queries/get-videos.xq' );
  var query;

  function resultsCallback( error, reply ) {
    if ( !error ) {
      res.setHeader( 'Content-Type', 'application/json' );
      // Not sure why there are orphaned xmlns attributes in the result, but can't figure out a good way to remove them using XQuery
      res.send( reply.result );
    } else {
      res.status( 400 ).send( error );
    }
  }

  function executeCallback( error, reply ) {
    if ( !error ) {
      res.setHeader( 'Content-Type', 'application/xml' );
      // Not sure why there are orphaned xmlns attributes in the result, but can't figure out a good way to remove them using XQuery
      res.send( reply.result.replace( /\s?xmlns=['"]\s*['"]/g, '' ) );
    } else {
      res.status( 400 ).send( error );
    }
  }

  switch ( mode ) {
    case 'json':
      statement += "\n\nf:getVideos( false() )";
      // Trusted source makes this OK
      // statement = eval( '`' + statement + '`' );
  
      query = client.query( statement );

      // query.bind(name,value,type,callback);
      // Binds a name to a value. Currently type is ignored.
      // query.bind("name", "nodex","",log.print);

      // Returns results as an array.
      query.results( resultsCallback );
    break;

    case 'xml':
    default:
      statement += "\n\nf:getVideos( true() )";

      query = client.query( statement );

      // Executes the query and returns all results as a single string.
      query.execute( executeCallback );
    break;
  }

  // client.close(function () {});
});

module.exports = router;