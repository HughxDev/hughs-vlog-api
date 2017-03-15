var express = require( 'express' );
var router = express.Router();
var basex  = require( 'basex' );
var fs = require( 'fs' );

const NS = {
  "": "http://vocab.nospoon.tv/ovml#",
  "ovml": "http://vocab.nospoon.tv/ovml#",
  "xlink": "http://www.w3.org/1999/xlink",
  "html": "http://www.w3.org/1999/xhtml",
  "mathml": "http://www.w3.org/1998/Math/MathML",
  "svg": "http://www.w3.org/2000/svg",
  "oembed": "http://oembed.com/"
};

function getXQueryNamespaceDeclarations() {
  var namespaces = '';

  for ( ns in NS ) {
    if ( ns === '' ) {
      namespaces += 'declare default element namespace "' + NS[ns] + '";' + "\n";
    } else {
      namespaces += 'declare namespace ' + ns + ' = "' + NS[ns] + '";' + "\n";
    }
  }

  return namespaces;
}

var client = new basex.Session( 'localhost', 1984, 'admin', 'admin' );

basex.debug_mode = false;

// @todo: DRYify

// /videos
router.get( '/', function ( req, res, next ) {
  // var mode = 'json';
  var mode = 'xml';
  var statement = fs.readFileSync( 'queries/get-videos.xq' );
  var namespaces = getXQueryNamespaceDeclarations();
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
  
  // Trusted source makes this OK even though it’s not ideal
  statement = eval( '`' + statement + '`' );

  switch ( mode ) {
    case 'json':
      statement += "\n\nf:getVideos( false() )";

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
} );

router.get( '/search', function ( req, res, next ) {
  var statement = fs.readFileSync( 'queries/find-title.xq' );
  var query;
  var namespaces = getXQueryNamespaceDeclarations();

  function executeCallback( error, reply ) {
    if ( !error ) {
      res.setHeader( 'Content-Type', 'application/xml' );
      // res.setHeader( 'Content-Type', 'text/plain' );
      // Not sure why there are orphaned xmlns attributes in the result, but can't figure out a good way to remove them using XQuery

      res.send( reply.result.replace( /\s?xmlns=['"]\s*['"]/g, '' ) );
    } else {
      res.status( 400 ).send( error );
    }
  }

  statement = eval( '`' + statement + '`' );
  statement += `\n\nf:findVideosByTitle( '${req.query.title}' )`;

  query = client.query( statement );

  // Executes the query and returns all results as a single string.
  query.execute( executeCallback );
} );

// @todo change to post/put
router.get( '/add', function ( req, res, next ) {
  var statement = fs.readFileSync( 'queries/add-video.xq' );
  var query;
  var namespaces = getXQueryNamespaceDeclarations();

  function executeCallback( error, reply ) {
    if ( !error ) {
      res.setHeader( 'Content-Type', 'application/xml' );
      res.send( reply.result.replace( /\s?xmlns=['"]\s*['"]/g, '' ) );
    } else {
      res.status( 400 ).send( error );
    }
  }

  var video = `
    <video type="personal" xml:lang="en">
      <title>Foo</title>
      <description>Lorem ipsum</description>
      <runtime>PT15M00S</runtime>
      <published>${new Date().toISOString()}</published>
    </video>
  `;

  statement = eval( '`' + statement + '`' );
  statement += `\n\nf:addVideo( (), ${video} )`;

  query = client.query( statement );

  // Executes the query and returns all results as a single string.
  query.execute( executeCallback );
} );

module.exports = router;