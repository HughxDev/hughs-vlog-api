const express = require( 'express' );
const router = express.Router();
const basex  = require( 'basex' );
const fs = require( 'fs' );
const Logger = require( 'bug-killer' );
const path = require( 'path' );
const join = path.join;

const NS = {
  "": "http://vocab.nospoon.tv/ovml#",
  "hvml": "http://vocab.nospoon.tv/ovml#",
  "xlink": "http://www.w3.org/1999/xlink",
  "html": "http://www.w3.org/1999/xhtml",
  "mathml": "http://www.w3.org/1998/Math/MathML",
  "svg": "http://www.w3.org/2000/svg",
  "oembed": "http://oembed.com/"
};

function getXQueryNamespaceDeclarations() {
  var namespaces = '';

  for ( var ns in NS ) {
    if ( ns === '' ) {
      namespaces += 'declare default element namespace "' + NS[ns] + '";' + "\n";
    } else {
      namespaces += 'declare namespace ' + ns + ' = "' + NS[ns] + '";' + "\n";
    }
  }

  return namespaces;
}

function searchVideos( query ) {
  return new Promise( function searchVideosPromise( resolve, reject ) {
    // var dir = __dirname.split( path.sep ).pop();
    // console.log( __dirname );
    var statement = fs.readFileSync( join( __dirname, '/../queries/find.xq' ) );
    var xquery;
    var namespaces = getXQueryNamespaceDeclarations();

    statement = eval( '`' + statement + '`' );

    if ( 'title' in query ) {
      statement += `\n\nf:findVideosByTitle( '${query.title}' )`;
    } else if ( 'published' in query ) {
      statement += `\n\nf:findVideosByPublishedDate( '${query.published}' )`;
    } else if ( ( 'publishedMin' in query ) && ( 'publishedMax' in query ) ) {
      statement += `\n\nf:findVideosByPublishedDateRange( '${query.publishedMin}', '${query.publishedMax}' )`;
    } else if ( 'recorded' in query ) {
      statement += `\n\nf:findVideosByRecordedDate( '${query.recorded}' )`;
    } else if ( ( 'recordedMin' in query ) && ( 'recordedMax' in query ) ) {
      statement += `\n\nf:findVideosByRecordedDateRange( '${query.recordedMin}', '${query.recordedMax}' )`;
    }

    xquery = client.query( statement );

    // Executes the query and returns all results as a single string.
    xquery.execute( function executeCallback( error, reply ) {
      if ( !error ) {
        // Not sure why there are orphaned xmlns attributes in the result, but can't figure out a good way to remove them using XQuery
        resolve( reply.result.replace( /\s?xmlns=['"]\s*['"]/g, '' ) );
      } else {
        reject( error );
      }
    } );
  } );
}

function replaceFeed( feed, req, res ) {
  var client = new basex.Session( 'localhost', 1984, 'admin', 'admin' );
  var statement = fs.readFileSync( join( __dirname, '..', '/queries/replace-feed.xq' ) );
  var query;
  // var namespaces = getXQueryNamespaceDeclarations();

  function executeCallback( error, reply ) {
    if ( !error ) {
      res.setHeader( 'Content-Type', 'application/xml' );
      res.send( reply.result.replace( /\s?xmlns=['"]\s*['"]/g, '' ) );
    } else {
      res.status( 400 ).send( error );
    }
  }

  feed = feed.replace( /<\?xml\s+version="[0-9]+\.[0-9]+"\s+encoding="[^"]+"\?>\n?/gi, '' );

  statement = eval( '`' + statement + '`' );
  statement += `\n\nf:replaceFeed( ${feed} )`;

  Logger.log( statement );

  query = client.query( statement );

  // Executes the query and returns all results as a single string.
  query.execute( executeCallback );
}

var client = new basex.Session( 'localhost', 1984, 'admin', 'admin' );

basex.debug_mode = false;

// @todo: DRYify

// /videos
router.get( '/', function getVideos( req, res, next ) {
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
      if ( 'limit' in req.query ) {
        statement += `\n\nf:getVideos( false(), ${req.query.limit} )`;
      } else {
        statement += "\n\nf:getVideos( false(), () )";
      }

      query = client.query( statement );

      // query.bind(name,value,type,callback);
      // Binds a name to a value. Currently type is ignored.
      // query.bind("name", "nodex","",log.print);

      // Returns results as an array.
      query.results( resultsCallback );
    break;

    case 'xml':
    /* falls through */
    default:
      if ( 'limit' in req.query ) {
        statement += `\n\nf:getVideos( true(), ${req.query.limit} )`;
      } else {
        statement += "\n\nf:getVideos( true(), () )";
      }

      query = client.query( statement );

      // Executes the query and returns all results as a single string.
      query.execute( executeCallback );
    break;
  }

  // client.close(function () {});
} );

router.get( '/search', function search( req, res, next ) {
  searchVideos( req.query )
    .then( function foundVideos( hvml ) {
      res.setHeader( 'Content-Type', 'application/xml' );
      res.send( hvml );
    } )
    .catch( function couldntFindVideos( error ) {
      res.status( 400 ).send( error );
    } )
  ;
} );

// @todo change to post/put
router.get( '/add', function addVideo( req, res, next ) {
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

router.put( '/replace', function replaceVideo( req, res, next ) {
  res.setHeader( 'Content-Type', 'application/xml' );
  // res.send( req.body );
  replaceFeed( req.body, req, res );
} );

module.exports = {
  "router": router,
  "replaceFeed": replaceFeed,
  "search": searchVideos
};
