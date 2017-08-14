import module namespace f = 'http://db.hugh.today/functions#' at 'queries/modules/functions.xqm';

declare default element namespace "http://vocab.nospoon.tv/ovml#";
declare namespace hvml = "http://vocab.nospoon.tv/ovml#";
declare namespace xlink = "http://www.w3.org/1999/xlink";
declare namespace oembed = "http://oembed.com/";
declare namespace html = "http://www.w3.org/1999/xhtml";
declare namespace mathml = "http://www.w3.org/1998/Math/MathML";
declare namespace svg = "http://www.w3.org/2000/svg";

declare boundary-space strip;

declare function f:addVideo(
  $season as xs:string?,
  $video as element()?
) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.hvml' )

  (: let episodeNumber := count(); :)
  let $episodeNumber := xs:integer(substring-after(data(($vlog//video)[last()]/@xml:id), '-')) + 1

  let $group :=
    if ( exists( $season ) )
    then
      (: xs:integer(substring-after(data((/*[local-name() = 'hvml']/element-with-id('hughs-vlog')//*[local-name()='group'][@type='series'])[last()]/@xml:id), '-')) :)
      <group xml:id="season-{$season}" type="series"></group>
    else
      ($vlog//element-with-id('hughs-vlog')//group[@type='series'])[last()]

  (: <video type="personal" xml:lang="en" xml:id="ep-{$episodeNumber}"></video> :)
  let $videoWithId :=
    copy $c := $video
    modify (
      insert node attribute { 'xml:id' } { concat( 'ep-', $episodeNumber ) } into $c
    )
    return $c

  return
    copy $xml := $group
    modify (
      (: replace value of node $season/author with 'BaseX', :)
      (: replace value of node $season/title with concat('Copy of: ', $c/title), :)
      (: insert node concat( 'ep-', $episodeNumber ) into $video/@xml:id, :)
      (: replace value of node $video/@xml:id with concat( 'ep-', $episodeNumber ), :)
      insert node $videoWithId into $xml
    )
    return $xml
};