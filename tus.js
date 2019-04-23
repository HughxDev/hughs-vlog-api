// --- Tus ---
const tus = require( 'tus-node-server' );
const server = new tus.Server();
const youtubeResumableUpload = require( './routes/youtube-resumable-upload.js' );
const reportUploadProgress = youtubeResumableUpload.reportUploadProgress;

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
        //  metadata[key] = {
        //     encoded: base64_value,
        //     decoded: Buffer.from(base64_value, 'base64').toString('ascii'),
        // };
        const decoded = Buffer.from(base64_value, 'base64').toString('ascii');
        metadata[key] = ( decoded === 'true' ? true : ( decoded === 'false' ? false : decoded ) );
        return metadata;
    }, {});
}

// const app = express();
const uploadApp = express();
const cors = function ( req, res, next ) {
  res.setHeader( 'Access-Control-Allow-Origin', '*' );
  // res.header( 'Access-Control-Allow-Headers', 'X-Auth-Key');
  res.setHeader( 'Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE' );
  res.setHeader( 'X-Content-Type-Options', 'nosniff' );

  next();
};

uploadApp.use( cors );

server.on( tus.EVENTS.EVENT_UPLOAD_COMPLETE, ( event ) => {
  console.log( `Upload complete for file ${event.file.id}` );

  var file = _parseMetadataString( event.file.upload_metadata );
  file.hash = event.file.id;
  file.archive = null;

  // @todo: filetype
  if ( file.filename.match( /\.redblue(\.xz)?$/i ) ) {
    decompress( `./files/${event.file.id}`, `./files/${event.file.id}--extracted/`, {
      "plugins": [
        // decompressTarxz()
      ]
    } ).then( ( files ) => {
      file.archive = files;
      // console.log( 'Files decompressed:', files );
      /* [
        {
          data: <Buffer 3c 3f 78 6d 6c 20 76 65 72 73 69 6f 6e 3d 22 31 2e 30 22 20 65 6e 63 6f 64 69 6e 67 3d 22 55 54 46 2d 38 22 3f 3e 0a 3c 68 76 6d 6c 0a 20 20 78 6d 6c ... >,
          mode: 420,
          mtime: 2018-08-12T08:07:26.000Z,
          path: 'video.hvml',
          type: 'file'
        },
        {
          data: <Buffer 1a 45 df a3 01 00 00 00 00 00 00 23 42 86 81 01 42 f7 81 01 42 f2 81 04 42 f3 81 08 42 82 88 6d 61 74 72 6f 73 6b 61 42 87 81 02 42 85 81 02 18 53 80 ... >,
          mode: 420,
          mtime: 2018-08-12T08:27:05.000Z,
          path: 'video.mkv',
          type: 'file'
        }
      ] */
      var videoFileRegex = /(\.mp4|\.webm|\.mov|\.mkv|\.avi)$/i;
      var hvmlFileRegex = /(\.hvml|\.ovml|\.xml)$/i;
      var videoFileIndex = null;
      var hvmlFileIndex = null;

      if ( file.archive.length ) {
        for ( var i = 0; i < file.archive.length; i++ ) {
          let archiveFile = file.archive[i];
          if ( videoFileRegex.test( archiveFile.path ) ) {
            videoFileIndex = i;
            console.log( 'videoFileIndex', videoFileIndex );
            if ( hvmlFileIndex !== null ) {
              /*
                Quit searching after both data are found.
                An upload to YouTube can not have more than
                one video file or more than one metadata file.
              */
              break;
            }
          } else if ( hvmlFileRegex.test( archiveFile.path ) ) {
            hvmlFileIndex = i;
            console.log( 'hvmlFileIndex', hvmlFileIndex );
            if ( videoFileIndex ) {
              break;
            }
          }
          // delete archiveFile.data;
        } // for

        file.hvml = file.archive[hvmlFileIndex];
        file.hvml.byteLength = file.archive[hvmlFileIndex].data.byteLength;
        delete file.archive[hvmlFileIndex].data;

        file.video = file.archive[videoFileIndex];
        file.video.byteLength = file.archive[videoFileIndex].data.byteLength;
        delete file.archive[videoFileIndex].data;

        delete file.archive;
      } // if file.archive.length

      var writeFileSync = fs.writeFileSync( `./files/${file.hash}.json`, JSON.stringify( file, null, 2 ), "utf8" );
      console.log( 'Wrote meta-metadata file' );
      // res.send( '' )
      // req.params.hash = file.hash;
      // reportUploadProgress( req, res );
      // res.send( file.hash );
    } );
  }
} ); // server.on

uploadApp.all( '*', server.handle.bind( server ) );
app.use( '/progress', youtubeResumableUpload.router );
app.use( '/uploads', uploadApp );

const host = '127.0.0.1';
const port = 1080;
app.listen( port, host );
// --- End Tus ---