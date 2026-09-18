//Thanks to https://www.telerik.com/blogs/using-web-share-api-react

import createIcon from 'react-share/lib/hocs/createIcon';
import createShareButton from 'react-share/lib/hocs/createShareButton';

const ShareIcon = createIcon({
  color: '#7f7f7f',
  networkName: 'email',
  path: "M 37.388 19.815 C 37.388 15.604 41.945 12.971 45.593 15.075 C 49.24 17.181 49.24 22.445 45.594 24.551 C 43.315 25.868 40.422 25.374 38.706 23.377 L 24.006 30.205 C 24.343 31.275 24.343 32.425 24.006 33.497 L 38.706 40.323 C 41.452 37.131 46.626 38.107 48.018 42.082 C 49.411 46.055 45.979 50.048 41.84 49.267 C 38.616 48.658 36.65 45.368 37.639 42.24 L 22.937 35.413 C 20.195 38.609 15.023 37.638 13.625 33.665 C 12.228 29.692 15.656 25.696 19.795 26.473 C 21.02 26.704 22.128 27.342 22.937 28.288 L 37.639 21.46 C 37.472 20.928 37.388 20.372 37.388 19.815 Z",
});

function shareLink(text, title) {
  const canonical = document.querySelector("link[rel=canonical]");
  let url = canonical ? canonical.href : document.location.href;
  return url;
}
const ShareLinkButton = createShareButton(
  'link',
  shareLink,
  props => ({
    text: props.text,
    title: props.title
  }),
  {
    openShareDialogOnClick: false,
    onClick: async (_, link) => {
      const shareDetails = { link, title: "title", text: "text" };
      if (navigator.share) {
        try {
          await navigator
            .share(shareDetails)
        } catch (error) {
          console.log(`Oops! I couldn't share to the world because: ${error}`);
        }
      } else {
        // fallback code
        console.log(
          "Web share is currently not supported on this browser. Please provide a callback"
        );
      }
    }
  },
);


function Share({ text, title }) {
  const canonical = document.querySelector("link[rel=canonical]");
  let url = canonical ? canonical.href : document.location.href;
  const shareDetails = { url, title, text };

  const handleSharing = async () => {
    if (navigator.share) {
      try {
        await navigator
          .share(shareDetails)
      } catch (error) {
        console.log(`Oops! I couldn't share to the world because: ${error}`);
      }
    } else {
      // fallback code
      console.log(
        "Web share is currently not supported on this browser. Please provide a callback"
      );
    }
  };
  return (
    <ShareIcon size={32} round onClick={handleSharing} style={{cursor: "pointer"}}/>
  );
}

export default Share;