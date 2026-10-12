export function CountryArt({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  const palettes: Record<string, string[]> = {
    IT: ["#d9e8dc", "#6d9580", "#3a6355"],
    DE: ["#f1dfc5", "#c69d65", "#80653c"],
    GB: ["#dde2f0", "#939db8", "#5a6280"],
    CA: ["#f0dcd4", "#c99582", "#845a50"],
    AU: ["#d9e8ec", "#7cabb3", "#45727c"],
  };
  const p = palettes[code] || palettes.IT;
  return (
    <svg
      className={className}
      viewBox="0 0 280 170"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      <rect width="280" height="170" fill={p[0]} />
      <circle cx="217" cy="40" r="25" fill="#fff" opacity=".55" />
      <path
        d="M0 135C45 111 64 132 106 126C153 119 202 117 280 143V170H0Z"
        fill={p[1]}
        opacity=".3"
      />
      {code === "IT" ? (
        <g fill={p[1]}>
          <path d="M56 78L66 65H213L224 78V146H56Z" />
          <path d="M66 63H214V69H66Z" fill={p[2]} />
          <path
            d="M70 83H211V89H70ZM65 108H218V114H65Z"
            fill={p[2]}
            opacity=".4"
          />
          {[75, 99, 123, 147, 171, 195].map((x) => (
            <g key={x}>
              <path d={`M${x} 102V95a7 7 0 0114 0v7Z`} fill={p[0]} />
              <path d={`M${x} 141V124a7 7 0 0114 0v17Z`} fill={p[0]} />
            </g>
          ))}
        </g>
      ) : code === "DE" ? (
        <g>
          <path d="M48 136H232V141H48Z" fill={p[2]} />
          <path d="M61 88H219V97H61ZM59 75L140 51L221 75V85H59Z" fill={p[1]} />
          {[77, 103, 129, 155, 181].map((x) => (
            <path key={x} d={`M${x} 96H${x + 15}V133H${x}Z`} fill={p[1]} />
          ))}
          <path d="M135 45H147V55H135Z" fill={p[2]} />
        </g>
      ) : code === "GB" ? (
        <g fill={p[1]}>
          <path d="M48 119H216V142H48ZM154 64H192V143H154ZM163 53H183V64H163ZM169 41H177V53H169Z" />
          <path d="M159 72H187V100H159Z" fill={p[2]} />
          <circle cx="173" cy="86" r="11" fill={p[0]} />
          <path d="M173 78V86L179 89" stroke={p[2]} strokeWidth="2" />
          <path d="M57 101H144V118H57L73 88L85 103L101 85L114 103L130 88Z" />
        </g>
      ) : code === "CA" ? (
        <g>
          <path d="M134 140H146L143 68H137Z" fill={p[2]} />
          <path d="M138 38H143V72H138ZM126 88L140 75L153 88Z" fill={p[2]} />
          <path d="M128 66H152V72H128Z" fill={p[1]} />
          {[65, 196, 216].map((x, i) => (
            <g key={x}>
              <path
                d={`M${x} ${90 + i * 9}L${x - 22} 131H${x + 22}Z`}
                fill={p[1]}
              />
              <path d={`M${x} 127V144`} stroke={p[2]} strokeWidth="4" />
            </g>
          ))}
        </g>
      ) : (
        <g fill={p[1]}>
          <path d="M45 141H235V147H45Z" fill={p[2]} />
          <path d="M68 136C74 109 75 84 71 68C101 86 112 109 117 136Z" />
          <path d="M109 136C122 109 125 75 119 51C151 73 166 106 171 136Z" />
          <path d="M159 136C176 112 184 91 183 70C209 90 218 112 219 136Z" />
        </g>
      )}
      <path d="M24 148H255" stroke={p[2]} opacity=".4" />
    </svg>
  );
}
