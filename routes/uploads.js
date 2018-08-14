const express = require( 'express' );
const router = express.Router();
const fs = require( 'fs' );

router.get( '/:hash', function ( req, res ) {
  console.log(req.params.hash);
  fs.readFile( `./files/${req.params.hash}`, function ( err, file ) {
    if ( err ) {
      res.send( err );
    }
    // console.log('jdkdfjsdlkfhsdhfjlsxzg,hmeleouhjkhkueihiuuij');
    res.send( file );
  } );
} );

module.exports = router;
