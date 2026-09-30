/** Flat, hand-authored kitchen graphic. All meaning is in the adjacent page copy. */
export function KitchenPlate() {
  return (
    <svg className="kitchen-plate" viewBox="0 0 480 420" fill="none" aria-hidden="true">
      <g className="plate-rings" stroke="currentColor">
        <circle cx="248" cy="211" r="128" strokeWidth="2" />
        <circle cx="248" cy="211" r="113" strokeWidth="1" />
        <circle cx="248" cy="211" r="84" strokeWidth="2" />
      </g>
      <g className="plate-pasta" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M212 180C188 203 222 236 246 215C270 194 229 171 217 195C205 219 241 242 268 224" />
        <path d="M267 176C301 193 285 249 251 244C216 239 222 209 246 204C270 199 277 219 259 230" />
        <path d="M206 223C192 250 254 267 278 237M246 168C217 151 186 183 199 203M282 192C309 209 294 244 278 250" />
      </g>
      <g
        className="plate-fork"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M66 91V144Q66 161 80 161Q94 161 94 144V91M80 91V157M80 161V313Q80 323 86 323Q92 323 92 313L87 164" />
      </g>
      <g
        className="plate-knife"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M414 92C391 117 399 161 414 174V313Q414 323 420 323Q426 323 426 313V92Z" />
      </g>
      <g
        className="plate-herbs"
        fill="currentColor"
        fillOpacity="0.13"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M258 172C244 147 259 135 277 137C283 154 273 166 258 172Z" />
        <path d="M258 172L270 146" />
        <path d="M333 343C331 317 351 311 366 320C364 340 350 345 333 343Z" />
        <path d="M333 343L357 324" />
      </g>
      <path className="plate-rule" d="M119 369H381" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
