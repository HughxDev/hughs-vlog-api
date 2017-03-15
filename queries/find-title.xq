import module namespace f = 'http://db.hugh.today/functions#' at 'Sites/hughs-vlog-api/queries/modules/functions.xqm';

${namespaces}

declare boundary-space strip;

declare function f:findVideosByTitle( $title as xs:string ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.ovml' )
  
  for $video in $vlog//ovml:video[ovml:title[text() contains text { $title } any word]]
    return <ovml>{ f:strip-namespace( $video ) }</ovml>
};