import type { SVGProps } from 'react'

// Selected icons adapted from Lets Icons by Leonid Tsvetkov.
// Source: https://www.figma.com/community/file/886554014393250663/free-icon-pack-1800-icons
// Package: https://www.npmjs.com/package/lets-icons
// License: Creative Commons Attribution 4.0 International.

type LetsIconProps = SVGProps<SVGSVGElement>

const createLetsIcon = (markup: string) => {
  const LetsIcon = ({ className, ...props }: LetsIconProps) => (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
      {...props}
    />
  )
  return LetsIcon
}

export const LetsDashboard = createLetsIcon(
  '<g fill="none" stroke="currentColor" stroke-linejoin="round"><rect width="6" height="6" x="4" y="4" rx="1"/><rect width="6" height="6" x="4" y="14" rx="1"/><rect width="6" height="6" x="14" y="14" rx="1"/><rect width="6" height="6" x="14" y="4" rx="1"/></g>',
)

export const LetsBookCheck = createLetsIcon(
  '<g fill="none" stroke="currentColor"><path d="M20 12v5c0 1.886 0 2.828-.586 3.414C18.828 21 17.886 21 16 21H6.5a2.5 2.5 0 0 1 0-5H16c1.886 0 2.828 0 3.414-.586C20 14.828 20 13.886 20 12V7c0-1.886 0-2.828-.586-3.414C18.828 3 17.886 3 16 3H8c-1.886 0-2.828 0-3.414.586C4 4.172 4 5.114 4 7v11.5"/><path stroke-linecap="round" d="m9 10l1.293 1.293a1 1 0 0 0 1.414 0L15 8"/></g>',
)

export const LetsTimer = createLetsIcon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" d="M5.636 5.636A9 9 0 1 0 12 3m0 9L6 6m6-3v2m9 7h-2m-7 7v2m-7-9H3"/>',
)

export const LetsCalendar = createLetsIcon(
  '<g fill="none"><rect width="18" height="15" x="3" y="6" stroke="currentColor" rx="2"/><path fill="currentColor" d="M3 10c0-1.886 0-2.828.586-3.414C4.172 6 5.114 6 7 6h10c1.886 0 2.828 0 3.414.586C21 7.172 21 8.114 21 10z"/><path stroke="currentColor" stroke-linecap="round" d="M7 3v3m10-3v3"/></g>',
)

export const LetsTarget = createLetsIcon(
  '<g fill="none" stroke="currentColor"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path stroke-linecap="round" d="M7.05 7.05L4 4m12.95 3.05L20 4m0 16l-3.05-3.05M4 20l3.05-3.05"/></g>',
)

export const LetsExam = createLetsIcon(
  '<g fill="none" stroke="currentColor" stroke-linecap="round"><path d="M17 11h.8c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C21 12.52 21 13.08 21 14.2v3.6c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C19.48 21 18.92 21 17.8 21H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C3 19.48 3 18.92 3 17.8v-3.6c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C4.52 11 5.08 11 6.2 11H7M5.5 21L7 11m11.5 10L17 11m-5 6v-3"/><path stroke-linejoin="round" d="M12 7V3.5c0-.236 0-.354.073-.427C12.146 3 12.264 3 12.5 3H17l-1.5 2L17 7zm0 0v3"/></g>',
)

export const LetsStethoscope = createLetsIcon(
  '<g fill="none"><circle cx="19" cy="14" r="2" fill="currentColor"/><circle cx="9" cy="13" r="2" fill="currentColor"/><path stroke="currentColor" stroke-linecap="round" d="M19 14v2a5 5 0 0 1-5 5h-2c-2.5 0-3-1.6-3-8m0-1c3.959 0 4.98-2.938 5-5.907a.15.15 0 0 0-.083-.134L12 5m-3 7c-3.959 0-4.98-2.938-5-5.907c0-.057.032-.109.083-.134L6 5"/></g>',
)

export const LetsChart = createLetsIcon(
  '<g fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10v6m4-4v4m4-8v8"/><rect width="18" height="16" x="3" y="4" rx="2"/></g>',
)

export const LetsFolder = createLetsIcon(
  '<g fill="none" stroke="currentColor"><path stroke-linecap="round" d="M15 20H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C3 18.48 3 17.92 3 16.8V7.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C4.52 4 5.08 4 6.2 4h1.475c.489 0 .733 0 .963.055a2 2 0 0 1 .579.24c.201.123.374.296.72.642l.126.126c.346.346.519.519.72.642c.18.11.375.19.579.24c.23.055.474.055.963.055H13.8c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C17 7.52 17 8.08 17 9.2v.3"/><path d="M5.316 12.28c.245-.818.368-1.227.611-1.53a2 2 0 0 1 .812-.604C7.1 10 7.527 10 8.381 10h8.318c1.458 0 2.187 0 2.673.304a2 2 0 0 1 .869 1.168c.151.553-.058 1.251-.477 2.648l-1.08 3.6c-.245.817-.368 1.227-.611 1.53a1.999 1.999 0 0 1-.812.604c-.36.146-.788.146-1.642.146H5.15c-.728 0-1.093 0-1.336-.152a1 1 0 0 1-.434-.584c-.076-.277.029-.626.238-1.324z"/><path stroke-linecap="round" d="M9 15h6"/></g>',
)

export const LetsBookmark = createLetsIcon(
  '<path fill="none" stroke="currentColor" d="M4 9c0-2.828 0-4.243.879-5.121C5.757 3 7.172 3 10 3h4c2.828 0 4.243 0 5.121.879C20 4.757 20 6.172 20 9v6.828c0 2.683 0 4.024-.844 4.435c-.845.41-1.9-.419-4.01-2.076l-.675-.531c-1.186-.932-1.78-1.398-2.471-1.398c-.692 0-1.285.466-2.471 1.398l-.676.53c-2.11 1.658-3.164 2.487-4.009 2.077C4 19.853 4 18.51 4 15.828z"/>',
)

export const LetsNotebook = createLetsIcon(
  '<g fill="none" stroke="currentColor"><rect width="13" height="17" x="6" y="4" rx="2"/><path stroke-linecap="round" d="M15 10V8M4 9h4m-4 4h4m-4 4h4"/></g>',
)

export const LetsBookOpen = createLetsIcon(
  '<path fill="none" stroke="currentColor" d="M5 17h4a3 3 0 0 1 3 3V10c0-2.828 0-4.243-.879-5.121C10.243 4 8.828 4 6 4H5c-.943 0-1.414 0-1.707.293C3 4.586 3 5.057 3 6v9c0 .943 0 1.414.293 1.707C3.586 17 4.057 17 5 17Zm14 0h-4a3 3 0 0 0-3 3V10c0-2.828 0-4.243.879-5.121C13.757 4 15.172 4 18 4h1c.943 0 1.414 0 1.707.293C21 4.586 21 5.057 21 6v9c0 .943 0 1.414-.293 1.707C20.414 17 19.943 17 19 17Z"/>',
)

export const LetsChemistry = createLetsIcon(
  '<g fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m11 7l2 3l-2 3H8l-2-3l2-3z"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m16 4l2 3l-2 3h-3l-2-3l2-3zm0 12l2 3M5 4l3 3m0 6l-2 2m7 1l-2 2m-5-8H4m14 3h3m-5-3l2 3l-2 3h-3l-2-3l2-3z"/><circle cx="9" cy="20" r="1" fill="currentColor"/><circle cx="4" cy="17" r="1" fill="currentColor"/><circle cx="21" cy="7" r="1" fill="currentColor"/></g>',
)

export const LetsUserCircle = createLetsIcon(
  '<g fill="none"><path fill="currentColor" fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10a9.977 9.977 0 0 1-3.443 7.55a7 7 0 0 0-13.114 0A9.977 9.977 0 0 1 2 12m14.83 8.706l.013.045A9.955 9.955 0 0 1 12 22a9.955 9.955 0 0 1-4.843-1.249a5 5 0 0 1 9.672-.045M10 9a2 2 0 1 1 4 0a2 2 0 0 1-4 0m2-4a4 4 0 1 0 0 8a4 4 0 0 0 0-8" clip-rule="evenodd"/><rect width="19" height="19" x="2.5" y="2.5" stroke="currentColor" rx="9.5"/></g>',
)

export const LetsSettings = createLetsIcon(
  '<g fill="none" stroke="currentColor"><path d="M3.082 13.945c-.529-.95-.793-1.426-.793-1.945c0-.519.264-.994.793-1.944L4.43 7.63l1.426-2.381c.559-.933.838-1.4 1.287-1.66c.45-.259.993-.267 2.08-.285L12 3.26l2.775.044c1.088.018 1.631.026 2.08.286c.45.26.73.726 1.288 1.659L19.57 7.63l1.35 2.426c.528.95.792 1.425.792 1.944c0 .519-.264.994-.793 1.944L19.57 16.37l-1.426 2.381c-.559.933-.838 1.4-1.287 1.66c-.45.259-.993.267-2.08.285L12 20.74l-2.775-.044c-1.088-.018-1.631-.026-2.08-.286c-.45-.26-.73-.726-1.288-1.659L4.43 16.37z"/><circle cx="12" cy="12" r="3"/></g>',
)

export const LetsBell = createLetsIcon(
  '<g fill="none"><path fill="currentColor" fill-rule="evenodd" d="M14.455 2.474a6.586 6.586 0 0 0-9.001 5.385l-.252 2.266l-.006.054a7 7 0 0 1-.939 2.782l-.028.047l-.578.963l-.024.04c-.242.403-.46.768-.606 1.077c-.148.314-.307.74-.23 1.224a2 2 0 0 0 .691 1.222c.376.314.822.397 1.168.432c.34.034.766.034 1.235.034h12.23c.469 0 .894 0 1.235-.034c.345-.035.792-.118 1.167-.432a2 2 0 0 0 .692-1.222c.077-.483-.082-.91-.23-1.224c-.146-.31-.364-.674-.606-1.077l-.024-.04l-.578-.963l-.028-.047a6.999 6.999 0 0 1-.815-2.047a5.023 5.023 0 0 1-2.045-.04a9.001 9.001 0 0 0 1.141 3.11l.032.053l.578.963c.273.456.438.733.536.94l.014.032a2.31 2.31 0 0 1-.035.004c-.227.023-.55.024-1.081.024H5.932c-.531 0-.854-.001-1.082-.024a2.337 2.337 0 0 1-.034-.004l.014-.032c.098-.207.263-.484.536-.94l.578-.963l.032-.053a9 9 0 0 0 1.207-3.577l.007-.06l.252-2.267a4.586 4.586 0 0 1 5.893-3.882a5.004 5.004 0 0 1 1.12-1.724m2.527 1.804a2 2 0 0 0-.937 2.145c.12.225.222.461.305.707a1.998 1.998 0 0 0 2.203.793l-.007-.064a6.564 6.564 0 0 0-1.564-3.581" clip-rule="evenodd"/><path stroke="currentColor" stroke-linecap="round" d="M9.102 17.665c.171.957.548 1.802 1.072 2.405c.524.603 1.166.93 1.826.93c.66 0 1.302-.327 1.826-.93s.9-1.448 1.072-2.405"/><circle cx="18" cy="6" r="2.5" fill="currentColor" stroke="currentColor"/></g>',
)

export const LetsArrowRight = createLetsIcon(
  '<path fill="currentColor" d="m20 12l.707-.707l.707.707l-.707.707zM5 13a1 1 0 1 1 0-2zm9.707-7.707l6 6l-1.414 1.414l-6-6zm6 7.414l-6 6l-1.414-1.414l6-6zM20 13H5v-2h15z"/>',
)

export const LetsArrowLeft = createLetsIcon(
  '<path fill="currentColor" d="m4 12l-.707-.707l-.707.707l.707.707zm15 1a1 1 0 1 0 0-2zM9.293 5.293l-6 6l1.414 1.414l6-6zm-6 7.414l6 6l1.414-1.414l-6-6zM4 13h15v-2H4z"/>',
)

export const LetsChevronDown = createLetsIcon(
  '<path fill="currentColor" d="m11.808 14.77l-3.715-4.458A.8.8 0 0 1 8.708 9h6.584a.8.8 0 0 1 .614 1.312l-3.714 4.458a.25.25 0 0 1-.384 0"/>',
)

export const LetsMenu = createLetsIcon(
  '<g fill="none" stroke="currentColor" stroke-linejoin="round"><rect width="16" height="5" x="4" y="5" rx="1"/><rect width="16" height="5" x="4" y="14" rx="1"/></g>',
)

export const LetsClose = createLetsIcon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M18 6L6 18M6 6l12 12"/>',
)

export const LetsHelp = createLetsIcon(
  '<g fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="18" r=".5" fill="currentColor"/><path d="M12 16v-1.419c0-.944.604-1.782 1.5-2.081a2.194 2.194 0 0 0 1.5-2.081v-.513C15 8.3 13.7 7 12.094 7H12a3 3 0 0 0-3 3"/></g>',
)

export const LetsRefresh = createLetsIcon(
  '<g fill="none" stroke="currentColor"><path d="m14 15l-4 4l4 4"/><path stroke-linecap="round" d="M5.938 15.5A7 7 0 1 1 12 19"/></g>',
)

export const LetsCloud = createLetsIcon(
  '<g fill="none"><path fill="currentColor" d="m8.99 19.982l.075.997zm-.074-.997A5.72 5.72 0 0 1 8.5 19v2c.19 0 .378-.007.565-.021zM8.5 19A5.5 5.5 0 0 1 3 13.5H1A7.5 7.5 0 0 0 8.5 21zM3 13.5A5.5 5.5 0 0 1 8.5 8V6A7.5 7.5 0 0 0 1 13.5zM8.5 8a5.502 5.502 0 0 1 5.038 3.29l1.832-.804A7.502 7.502 0 0 0 8.5 6zm7.5 5a3 3 0 0 1 3 3h2a5 5 0 0 0-5-5zm3 3a3 3 0 0 1-3 3v2a5 5 0 0 0 5-5zm-3 3H9.01v2H16zm-6.99 0a.99.99 0 0 1 .99.99H8c0 .558.452 1.01 1.01 1.01zm4.528-7.71c.393.895 1.28 1.71 2.462 1.71v-2c-.194 0-.47-.149-.63-.514zm-4.473 9.69A.99.99 0 0 1 8 19.991h2c0-.588-.5-1.05-1.084-1.006z"/><path stroke="currentColor" d="M17.879 12.902A4 4 0 1 0 13 9.016"/></g>',
)

export const LetsShield = createLetsIcon(
  '<g fill="none" stroke="currentColor" stroke-linecap="round"><path d="M18.702 5.784L12.788 3.25a2 2 0 0 0-1.576 0L5.298 5.784A2 2 0 0 0 4.1 7.871l.613 4.904a7 7 0 0 0 2.465 4.509l3.54 2.95a2 2 0 0 0 2.561 0l3.541-2.95a7 7 0 0 0 2.465-4.51l.613-4.903a2 2 0 0 0-1.197-2.087Z"/><path d="m9 12l2.569 2.569a.5.5 0 0 0 .77-.077L16 9"/></g>',
)

export const LetsTrophy = createLetsIcon(
  '<g fill="none"><path stroke="currentColor" stroke-linecap="round" d="M16.5 20.5h-9"/><path fill="currentColor" d="M13 18.5a1 1 0 1 1-2 0zm-2 0V16h2v2.5z"/><path stroke="currentColor" stroke-linecap="round" d="M10.5 9.5h3m-8 5s-2-1.5-2-4v-2a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v1m11 5s2-1.5 2-4v-2a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1"/><path stroke="currentColor" d="M16.5 11.36V7.5a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v3.86a4 4 0 0 0 1.781 3.328l2.164 1.442a1 1 0 0 0 1.11 0l2.164-1.442a4 4 0 0 0 1.781-3.329Z"/></g>',
)

export const LetsStar = createLetsIcon(
  '<path fill="none" stroke="currentColor" d="M10.144 6.628c.786-1.961 1.18-2.942 1.856-2.942c.676 0 1.07.98 1.856 2.942l.037.09c.444 1.109.666 1.663 1.12 2c.452.336 1.047.39 2.236.496l.214.019c1.946.174 2.92.261 3.127.88c.209.62-.514 1.277-1.96 2.591l-.481.44c-.732.665-1.098.998-1.268 1.434a2.002 2.002 0 0 0-.08.25c-.111.454-.004.937.21 1.902l.067.3c.393 1.775.59 2.662.247 3.045a1 1 0 0 1-.481.296c-.496.136-1.2-.438-2.61-1.586c-.925-.754-1.388-1.131-1.919-1.216a1.997 1.997 0 0 0-.63 0c-.532.085-.994.462-1.92 1.216c-1.408 1.148-2.113 1.722-2.609 1.586a1 1 0 0 1-.48-.296c-.344-.383-.147-1.27.246-3.044l.067-.301c.214-.966.321-1.448.21-1.903a2.002 2.002 0 0 0-.08-.25c-.17-.435-.536-.768-1.268-1.434l-.482-.439c-1.445-1.314-2.168-1.972-1.96-2.59c.209-.62 1.182-.707 3.128-.881l.214-.02c1.19-.106 1.784-.159 2.237-.496c.453-.336.675-.89 1.12-1.998z"/>',
)

export const LetsUpload = createLetsIcon(
  '<path fill="currentColor" fill-rule="evenodd" d="M12 2a6.001 6.001 0 0 0-5.476 3.545a23.012 23.012 0 0 1-.207.452l-.02.001C6.233 6 6.146 6 6 6a4 4 0 1 0 0 8h.172l2-2H6a2 2 0 1 1 0-4h.064c.208 0 .45.001.65-.04a1.94 1.94 0 0 0 .7-.27c.241-.156.407-.35.533-.527a2.39 2.39 0 0 0 .201-.36c.053-.11.118-.255.196-.428l.004-.01a4.001 4.001 0 0 1 7.304 0l.005.01c.077.173.142.317.195.428c.046.097.114.238.201.36c.126.176.291.371.533.528c.242.156.487.227.7.27c.2.04.442.04.65.04L18 8a2 2 0 1 1 0 4h-2.172l2 2H18a4 4 0 0 0 0-8c-.146 0-.233 0-.297-.002h-.02A6.001 6.001 0 0 0 12 2m5.702 4.034" clip-rule="evenodd"/><path fill="currentColor" d="m12 12l-.707-.707l.707-.707l.707.707zm1 9a1 1 0 1 1-2 0zm-5.707-5.707l4-4l1.414 1.414l-4 4zm5.414-4l4 4l-1.414 1.414l-4-4zM13 12v9h-2v-9z"/>',
)
