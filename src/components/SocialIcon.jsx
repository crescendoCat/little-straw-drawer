import PropTypes from 'prop-types';

/**
 * Round, brand-colored badge around a react-icons glyph. Replaces the icon
 * components that used to come from react-share.
 */
export default function SocialIcon({ icon: Icon, bgColor, size = 32, label, className = '', style, ...rest }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`social-icon ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bgColor,
        color: '#fff',
        verticalAlign: 'middle',
        ...style,
      }}
      {...rest}
    >
      <Icon size={size * 0.55} aria-hidden="true" />
    </span>
  );
}

SocialIcon.propTypes = {
  icon: PropTypes.elementType.isRequired,
  bgColor: PropTypes.string.isRequired,
  size: PropTypes.number,
  label: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};
