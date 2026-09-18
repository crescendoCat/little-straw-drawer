//Thanks to https://www.telerik.com/blogs/using-web-share-api-react
import PropTypes from 'prop-types';
import { FaShareNodes } from 'react-icons/fa6';
import SocialIcon from './SocialIcon';

export function getShareUrl() {
  const canonical = document.querySelector('link[rel=canonical]');
  return canonical ? canonical.href : document.location.href;
}

/**
 * Native Web Share button (navigator.share). Hidden when the browser does not
 * support the API, since there is nothing useful it could do.
 */
function Share({ text, title, size = 32 }) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return null;
  }

  const handleSharing = async () => {
    try {
      await navigator.share({ url: getShareUrl(), title, text });
    } catch (error) {
      // AbortError is the user closing the sheet; anything else is worth a log.
      if (error?.name !== 'AbortError') {
        console.log(`Oops! I couldn't share to the world because: ${error}`);
      }
    }
  };

  return (
    <button
      type="button"
      className="share-native-button"
      aria-label="Share"
      onClick={handleSharing}
      style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', lineHeight: 0 }}
    >
      <SocialIcon icon={FaShareNodes} bgColor="#7f7f7f" size={size} />
    </button>
  );
}

Share.propTypes = {
  text: PropTypes.string,
  title: PropTypes.string,
  size: PropTypes.number,
};

export default Share;
