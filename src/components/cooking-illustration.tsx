/** Original category illustrations: kitchen tools, never a fabricated recipe photo. */
export function CookingIllustration({
  vibe = 'cozy',
  compact = false,
}: {
  vibe?: string;
  compact?: boolean;
}) {
  return (
    <svg
      className={`cooking-illustration illustration-${vibe} ${compact ? 'compact' : ''}`}
      viewBox="0 0 320 190"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="illustration-ground"
        d="M40 154H282M66 164H256"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g
        className="illustration-tools"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M263 147V79M257 85V65M263 85V65M269 85V65M257 85Q263 93 269 85" />
        <path d="M64 150L52 95Q48 81 56 77Q65 75 66 90L72 147" />
        <path
          className="illustration-herb"
          d="M82 144L90 106M87 124Q74 109 79 103Q93 106 87 124ZM90 115Q105 112 105 102Q90 103 90 115Z"
        />
      </g>
      {vibe === 'lazy' ? (
        <g
          className="illustration-dish"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        >
          <path
            className="illustration-wash"
            d="M107 103Q107 95 116 95H213Q222 95 222 104V148H107Z"
          />
          <path d="M128 94V72Q120 63 132 57Q143 51 153 58H189Q203 51 211 59Q219 66 207 73V94" />
          <path d="M120 145V151M210 145V151M127 104H200M212 114V133" />
          <circle cx="192" cy="126" r="5" />
        </g>
      ) : vibe === 'fancy' ? (
        <g
          className="illustration-dish"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className="illustration-wash" d="M108 137Q110 76 162 76Q214 76 220 137Z" />
          <path d="M101 145H227M162 76V65M153 65H171M126 124Q128 101 145 93" />
        </g>
      ) : vibe === 'chaotic' ? (
        <g
          className="illustration-dish"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className="illustration-wash" d="M109 107Q118 148 161 148Q204 148 213 107Z" />
          <path d="M112 113L82 98M207 113L245 90M140 148V153M181 148V153" />
          <path d="M125 97L133 92M150 94L158 101M173 94L179 87M189 101L198 97" />
        </g>
      ) : (
        <g
          className="illustration-dish"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            className="illustration-wash"
            d="M110 98H217V129Q217 149 198 149H129Q110 149 110 129Z"
          />
          <path d="M110 107H97V124H109M218 107H230V124H218M108 91H219M153 91V83H174V91M121 111V129Q121 138 131 138" />
        </g>
      )}
      <g className="illustration-steam" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M143 68Q136 59 143 50Q150 42 143 35" />
        <path d="M164 61Q157 52 164 43Q171 35 164 28" />
        <path d="M185 68Q178 59 185 50Q192 42 185 35" />
      </g>
    </svg>
  );
}
