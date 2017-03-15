import module namespace f = 'http://db.hugh.today/functions#' at 'Sites/hughs-vlog-api/queries/modules/functions.xqm';

${namespaces}

declare boundary-space strip;

declare function f:retrieveVideos() {
  let $vlog := db:open( 'hughs-vlog', 'vlog.ovml' )
  
  for $video in $vlog//ovml:video
    return f:strip-namespace( $video )
};

declare function f:getVideos( $wrap as xs:boolean ) {
  if ( $wrap )
  then
    <ovml>{
      f:retrieveVideos()
    }</ovml>
  else
    f:retrieveVideos()
};