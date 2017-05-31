import module namespace f = 'http://db.hugh.today/functions#' at 'Sites/hughs-vlog-api/queries/modules/functions.xqm';

${namespaces}

declare boundary-space strip;

declare function f:findVideosByTitle( $title as xs:string ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.ovml' )
  
  for $video in $vlog//ovml:video[ovml:title[text() contains text { $title } any word]]
    return <ovml>{ f:strip-namespace( $video ) }</ovml>
};

declare function f:findVideosByPublishedDate( $date as xs:string ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.ovml' )
  
  for $video in $vlog//ovml:video[ovml:published[contains(., $date)]]
    return <ovml>{ f:strip-namespace( $video ) }</ovml>
};

declare function f:findVideosByPublishedDateRange( $dateMin as xs:string, $dateMax as xs:string ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.ovml' )
  
  return
    <ovml>{
    for $video in $vlog//ovml:video[ovml:published > $dateMin and ovml:published < $dateMax]
      return f:strip-namespace( $video )
    }</ovml>
};