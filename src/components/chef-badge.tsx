import { ApronIcon } from './apron-icon';
export function ChefBadge({ level }: { level: number }) {
  return (
    <svg
      className={`chef-badge badge-level-${level}`}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <path className="badge-patch" d="M30 9L89 11L109 31L108 91L86 110L28 108L10 88L11 29Z" />
      <path className="badge-stitch" d="M32 17L85 19L101 34L100 86L82 102L33 100L18 83L19 34Z" />
      <g
        className="badge-object"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {level === 1 && (
          <>
            <path
              className="badge-paint"
              d="M37 41Q27 25 40 23Q50 19 58 26Q68 18 80 25Q90 31 80 42V85H37Z"
            />
            <path d="M47 43Q42 34 48 32Q55 30 59 34Q69 28 73 35V74H47Z" />
            <path className="badge-detail" d="M53 51L65 48L68 60L55 63Z" />
          </>
        )}
        {level === 2 && (
          <>
            <path className="badge-paint" d="M28 62H89Q88 87 59 89Q31 87 28 62Z" />
            <path d="M48 60L68 29Q75 20 80 27Q83 30 78 39L62 64M65 32L78 39M69 37L55 61M34 71Q38 80 48 82" />
          </>
        )}
        {level === 3 && (
          <>
            <ellipse className="badge-paint" cx="53" cy="65" rx="29" ry="22" />
            <ellipse cx="53" cy="65" rx="19" ry="13" />
            <path d="M72 47L88 27Q92 24 96 29Q97 31 94 34L81 55" />
            <path className="badge-detail" d="M40 67Q51 51 65 64Q64 78 50 77Q44 76 40 67Z" />
          </>
        )}
        {level === 4 && (
          <>
            <path className="badge-paint" d="M31 51H80V72Q80 90 62 90H49Q31 90 31 73Z" />
            <path d="M29 46H82M48 46V39H64V46M80 56L98 47M31 59H22V72H31" />
            <path className="badge-steam" d="M45 30Q39 25 45 19" />
            <path className="badge-steam" d="M62 29Q56 23 63 17" />
          </>
        )}
        {level === 5 && (
          <>
            <path className="badge-paint" d="M31 65H85Q84 88 58 90Q32 88 31 65Z" />
            <path d="M59 62L81 30Q85 24 91 29Q94 33 90 37L70 63" />
            <path
              className="badge-herb"
              d="M38 62L42 35M42 47Q28 47 30 34Q44 33 42 47ZM43 45Q58 42 55 31Q42 33 43 45Z"
            />
          </>
        )}
        {level === 6 && (
          <>
            <path className="badge-paint" d="M26 80Q29 42 59 42Q90 42 94 80Z" />
            <path d="M23 87H98M59 42V31M51 31H67M38 71Q40 54 50 50" />
          </>
        )}
      </g>
      {level === 7 && (
        <g transform="translate(26 24) scale(2.1)">
          <ApronIcon size={32} filled />
        </g>
      )}
    </svg>
  );
}
