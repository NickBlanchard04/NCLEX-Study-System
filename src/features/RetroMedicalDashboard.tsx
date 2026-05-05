import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileArchive,
  FileText,
  HeartPulse,
  Inbox,
  LockKeyhole,
  MessageSquare,
  Microscope,
  MoreHorizontal,
  PanelRightOpen,
  Pill,
  Printer,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Stethoscope,
  Syringe,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'

const patient = {
  name: 'Jordan Ellis',
  dob: '1984-11-09',
  age: 41,
  sex: 'F',
  mrn: 'MRN-704219',
  allergies: 'Penicillin, Latex',
  risk: 'High Risk',
  insurance: 'Verified',
  chiefComplaint: 'Chest tightness and shortness of breath',
}

const navItems = [
  { label: 'Patients', icon: Users, active: true },
  { label: 'Schedule', icon: CalendarDays },
  { label: 'Messages', icon: MessageSquare },
  { label: 'Billing', icon: CreditCard },
  { label: 'Reports', icon: FileArchive },
  { label: 'Settings', icon: Settings },
]

const vitals = [
  { label: 'BP', value: '148/92', unit: 'mmHg', trend: 'elevated', tone: 'warning' },
  { label: 'HR', value: '104', unit: 'bpm', trend: '+12', tone: 'critical' },
  { label: 'SpO2', value: '94', unit: '%', trend: 'watch', tone: 'warning' },
  { label: 'Temp', value: '99.1', unit: 'F', trend: 'stable', tone: 'normal' },
]

const labs = [
  { test: 'Troponin I', result: '0.08', flag: 'Critical Value Flag', range: '< 0.04 ng/mL', status: 'Critical' },
  { test: 'Potassium', result: '3.4', flag: 'Abnormal Result Flag', range: '3.5-5.0 mEq/L', status: 'Abnormal' },
  { test: 'WBC', result: '9.8', flag: 'Reviewed', range: '4.5-11.0 K/uL', status: 'Reviewed' },
  { test: 'HbA1c', result: '7.2', flag: 'Pending provider sign-off', range: '< 5.7%', status: 'Pending' },
]

const meds = [
  { name: 'Metoprolol tartrate', dose: '25 mg PO BID', status: 'Active' },
  { name: 'Atorvastatin', dose: '40 mg PO nightly', status: 'Active' },
  { name: 'Albuterol inhaler', dose: '2 puffs PRN', status: 'Reviewed' },
]

const problems = [
  'Hypertension',
  'Type 2 diabetes mellitus',
  'Intermittent asthma',
  'Medication Reconciliation due',
]

const timeline = [
  { time: '08:12', title: 'Triage complete', detail: 'Chief Complaint documented and vitals attached.' },
  { time: '08:27', title: 'Lab draw', detail: 'STAT cardiac panel and CMP ordered.' },
  { time: '08:44', title: 'Critical alert', detail: 'Troponin result routed to provider.' },
  { time: '09:05', title: 'Care plan updated', detail: 'Repeat ECG and observation status added.' },
]

const tasks = [
  { label: 'Review Critical Value Flag', due: 'Now', tone: 'critical' },
  { label: 'Complete SOAP Note', due: '11:30', tone: 'warning' },
  { label: 'Medication Reconciliation', due: 'Today', tone: 'normal' },
  { label: 'Immunization Record update', due: '2d', tone: 'normal' },
]

const inbox = [
  { from: 'Cardiology', subject: 'ECG review requested', status: 'New' },
  { from: 'Front Desk', subject: 'Insurance status updated', status: 'Reviewed' },
  { from: 'Lab', subject: 'CMP partial resulted', status: 'Pending' },
]

const queue = [
  { room: 'WR-02', name: 'Mock Patient A', status: 'Waiting', elapsed: '14m' },
  { room: 'EX-04', name: 'Mock Patient B', status: 'Roomed', elapsed: '06m' },
  { room: 'LAB', name: 'Mock Patient C', status: 'Pending', elapsed: '22m' },
]

export function RetroMedicalDashboard() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(true)
  const [accordionOpen, setAccordionOpen] = useState('HPI')
  const [ordersEnabled, setOrdersEnabled] = useState(true)
  const [selectedPriority, setSelectedPriority] = useState('Urgent')
  const [step, setStep] = useState(2)

  const tabs = useMemo(
    () => ['Overview', 'Vitals', 'Medications', 'Labs', 'Notes', 'Documents'],
    [],
  )

  return (
    <main className="retro-med min-h-screen">
      <div className="retro-scanline" aria-hidden="true" />
      <header className="retro-topbar">
        <div className="retro-brand" aria-label="MedCore Command">
          <div className="retro-brand-mark">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <h1>MEDCORE COMMAND</h1>
            <p>CLINICAL OPS TERMINAL 84</p>
          </div>
        </div>

        <label className="retro-search">
          <Search className="h-4 w-4" />
          <input placeholder="Global patient search / MRN / ICD-10 Search / CPT Code Search" />
        </label>

        <div className="retro-top-actions">
          <button type="button" className="retro-icon-button" aria-label="System alerts">
            <Bell className="h-4 w-4" />
            <span />
          </button>
          <button type="button" className="retro-icon-button" aria-label="Print chart">
            <Printer className="h-4 w-4" />
          </button>
          <button type="button" className="retro-action-button" onClick={() => setModalOpen(true)}>
            <ClipboardCheck className="h-4 w-4" />
            New Order
          </button>
          <div className="retro-profile">
            <div>DR</div>
            <span>Dr. S. Morgan</span>
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </header>

      <div className="retro-layout">
        <aside className="retro-sidebar">
          <nav aria-label="Primary medical software navigation">
            {navItems.map(({ label, icon: Icon, active }) => (
              <button key={label} type="button" className={clsx('retro-nav-item', active && 'active')}>
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="retro-secure">
            <LockKeyhole className="h-4 w-4" />
            <div>
              <strong>SECURE SESSION</strong>
              <span>Audit logging active</span>
            </div>
          </div>
        </aside>

        <section className="retro-workspace" aria-label="Patient chart workspace">
          <PatientBanner />

          <div className="retro-tabs" role="tablist" aria-label="Patient chart tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={clsx(activeTab === tab && 'active')}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <AlertStrip />

          <div className="retro-grid">
            <section className="retro-main-column">
              <Panel title="Patient Summary" icon={<UserRound className="h-4 w-4" />} action="SOAP Note">
                <div className="retro-summary-grid">
                  <ClinicalField label="Chief Complaint" value={patient.chiefComplaint} />
                  <ClinicalField label="HPI" value="Symptoms began this morning with exertion; improves at rest." />
                  <ClinicalField label="ROS" value="Positive for dyspnea. Negative for fever, syncope, unilateral weakness." />
                  <ClinicalField label="Assessment and Plan" value="Rule out ACS. Repeat ECG, trend troponin, monitor telemetry." />
                </div>
              </Panel>

              <Panel title="Clinical Snapshot" icon={<Activity className="h-4 w-4" />}>
                <div className="retro-snapshot">
                  <div>
                    <span>Readiness</span>
                    <strong>Provider review pending</strong>
                    <Progress value={64} tone="amber" />
                  </div>
                  <div>
                    <span>Risk Stratification</span>
                    <strong>High Risk</strong>
                    <Progress value={82} tone="red" />
                  </div>
                  <div>
                    <span>Growth Chart</span>
                    <strong>Adult record only</strong>
                    <Progress value={32} tone="green" />
                  </div>
                </div>
                <MiniChart />
              </Panel>

              <div className="retro-two">
                <Panel title="Vitals Panel" icon={<HeartPulse className="h-4 w-4" />}>
                  <div className="retro-vitals">
                    {vitals.map((vital) => (
                      <div key={vital.label} className={clsx('retro-vital', vital.tone)}>
                        <span>{vital.label}</span>
                        <strong>{vital.value}</strong>
                        <small>{vital.unit} / {vital.trend}</small>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Medication List" icon={<Pill className="h-4 w-4" />}>
                  <div className="retro-list">
                    {meds.map((med) => (
                      <div key={med.name} className="retro-list-row">
                        <div>
                          <strong>{med.name}</strong>
                          <span>{med.dose}</span>
                        </div>
                        <Badge tone={med.status === 'Active' ? 'green' : 'teal'}>{med.status}</Badge>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <Panel title="Lab Results Table" icon={<Microscope className="h-4 w-4" />} action="Critical Value Flag">
                <div className="retro-table-wrap">
                  <table className="retro-table">
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Result</th>
                        <th>Flag</th>
                        <th>Reference Range</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labs.map((lab) => (
                        <tr key={lab.test}>
                          <td>{lab.test}</td>
                          <td className="mono">{lab.result}</td>
                          <td>{lab.flag}</td>
                          <td>{lab.range}</td>
                          <td>
                            <Badge tone={lab.status === 'Critical' ? 'red' : lab.status === 'Abnormal' ? 'amber' : 'green'}>
                              {lab.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="Timeline" icon={<Clock3 className="h-4 w-4" />}>
                <div className="retro-timeline">
                  {timeline.map((event) => (
                    <div key={`${event.time}-${event.title}`}>
                      <span className="mono">{event.time}</span>
                      <div>
                        <strong>{event.title}</strong>
                        <p>{event.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            <aside className="retro-side-column">
              <CriticalAlert />

              <Panel title="Problem List" icon={<ShieldAlert className="h-4 w-4" />}>
                <div className="retro-check-list">
                  {problems.map((problem, index) => (
                    <label key={problem}>
                      <input type="checkbox" defaultChecked={index < 3} />
                      <span>{problem}</span>
                    </label>
                  ))}
                </div>
              </Panel>

              <Panel title="Orders Panel" icon={<ClipboardCheck className="h-4 w-4" />}>
                <div className="retro-orders">
                  <Toggle checked={ordersEnabled} onChange={setOrdersEnabled} label="STAT cardiac protocol" />
                  <Stepper value={step} onChange={setStep} />
                  <button type="button" className="retro-ghost-button" onClick={() => setDrawerOpen(true)}>
                    <PanelRightOpen className="h-4 w-4" />
                    Open order drawer
                  </button>
                </div>
              </Panel>

              <Panel title="Care Plan Section" icon={<Stethoscope className="h-4 w-4" />}>
                <div className="retro-care-plan">
                  <div>
                    <span>Observation</span>
                    <Badge tone="amber">Pending</Badge>
                  </div>
                  <p>Repeat ECG in 30 minutes, trend troponin, reassess pain score, review medication reconciliation.</p>
                </div>
              </Panel>
            </aside>
          </div>

          <WorkflowArea selectedPriority={selectedPriority} setSelectedPriority={setSelectedPriority} />

          <FormsAndData
            accordionOpen={accordionOpen}
            setAccordionOpen={setAccordionOpen}
            setModalOpen={setModalOpen}
            setDrawerOpen={setDrawerOpen}
          />
        </section>
      </div>

      {drawerOpen ? <OrderDrawer onClose={() => setDrawerOpen(false)} /> : null}
      {modalOpen ? <ModalExample onClose={() => setModalOpen(false)} /> : null}
      {toastOpen ? <Toast onClose={() => setToastOpen(false)} /> : null}
    </main>
  )
}

function PatientBanner() {
  return (
    <section className="retro-patient-banner" aria-label="Patient banner">
      <div className="retro-patient-main">
        <div className="retro-patient-avatar">JE</div>
        <div>
          <p>MOCK PATIENT CHART</p>
          <h2>{patient.name}</h2>
        </div>
      </div>
      <div className="retro-patient-facts">
        <InfoChip label="DOB" value={patient.dob} />
        <InfoChip label="Age" value={String(patient.age)} />
        <InfoChip label="Sex" value={patient.sex} />
        <InfoChip label="MRN" value={patient.mrn} />
        <InfoChip label="Allergies" value={patient.allergies} tone="red" />
        <InfoChip label="Risk" value={patient.risk} tone="amber" />
        <InfoChip label="Insurance" value={patient.insurance} tone="green" />
      </div>
    </section>
  )
}

function AlertStrip() {
  return (
    <section className="retro-alert-strip" aria-label="Safety alerts">
      <AlertTriangle className="h-5 w-5" />
      <div>
        <strong>Allergy Alert</strong>
        <span>Penicillin allergy on file. Verify medication orders before signing.</span>
      </div>
      <Badge tone="red">Critical</Badge>
    </section>
  )
}

function CriticalAlert() {
  return (
    <section className="retro-critical" aria-label="Critical alert">
      <div>
        <AlertTriangle className="h-5 w-5" />
        <strong>Critical Alert</strong>
      </div>
      <p>Troponin I above reference range. Provider acknowledgement required.</p>
      <button type="button">Acknowledge</button>
    </section>
  )
}

function WorkflowArea({
  selectedPriority,
  setSelectedPriority,
}: {
  selectedPriority: string
  setSelectedPriority: (value: string) => void
}) {
  return (
    <section className="retro-workflow" aria-label="Workflow area">
      <Panel title="Appointment Scheduler" icon={<CalendarDays className="h-4 w-4" />}>
        <div className="retro-schedule">
          <div>
            <Clock3 className="h-4 w-4" />
            <strong>09:30</strong>
            <span>Follow-up ECG</span>
          </div>
          <div>
            <Clock3 className="h-4 w-4" />
            <strong>10:15</strong>
            <span>Provider reassessment</span>
          </div>
        </div>
      </Panel>

      <Panel title="Task List" icon={<ClipboardCheck className="h-4 w-4" />}>
        <div className="retro-task-list">
          {tasks.map((task) => (
            <div key={task.label} className="retro-task">
              <span className={clsx('retro-dot', task.tone)} />
              <strong>{task.label}</strong>
              <small>{task.due}</small>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Inbox / Message Center" icon={<Inbox className="h-4 w-4" />}>
        <div className="retro-inbox">
          {inbox.map((message) => (
            <div key={message.subject}>
              <strong>{message.from}</strong>
              <span>{message.subject}</span>
              <Badge tone={message.status === 'New' ? 'teal' : message.status === 'Pending' ? 'amber' : 'green'}>
                {message.status}
              </Badge>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Queue / Waiting Room" icon={<Radio className="h-4 w-4" />}>
        <div className="retro-queue">
          {queue.map((item) => (
            <div key={item.room}>
              <span className="mono">{item.room}</span>
              <strong>{item.name}</strong>
              <small>{item.status} / {item.elapsed}</small>
            </div>
          ))}
        </div>
        <div className="retro-radio-group" role="radiogroup" aria-label="Priority">
          {['Routine', 'Urgent', 'Critical'].map((priority) => (
            <label key={priority}>
              <input
                type="radio"
                checked={selectedPriority === priority}
                onChange={() => setSelectedPriority(priority)}
              />
              <span>{priority}</span>
            </label>
          ))}
        </div>
      </Panel>
    </section>
  )
}

function FormsAndData({
  accordionOpen,
  setAccordionOpen,
  setModalOpen,
  setDrawerOpen,
}: {
  accordionOpen: string
  setAccordionOpen: (value: string) => void
  setModalOpen: (value: boolean) => void
  setDrawerOpen: (value: boolean) => void
}) {
  return (
    <section className="retro-lower-grid" aria-label="Forms and data display">
      <Panel title="Intake and Order Entry" icon={<FileText className="h-4 w-4" />} action="Stepper Form">
        <form className="retro-form">
          <label>
            <span>Chief Complaint</span>
            <input defaultValue={patient.chiefComplaint} />
          </label>
          <label>
            <span>ICD-10 Search</span>
            <input placeholder="I10, R07.9, E11.9" list="icd-options" />
            <datalist id="icd-options">
              <option value="R07.9 - Chest pain, unspecified" />
              <option value="I10 - Essential hypertension" />
              <option value="E11.9 - Type 2 diabetes mellitus" />
            </datalist>
          </label>
          <label>
            <span>CPT Code Search</span>
            <select defaultValue="99214">
              <option value="99213">99213 Established patient visit</option>
              <option value="99214">99214 Moderate complexity visit</option>
              <option value="93000">93000 ECG with interpretation</option>
            </select>
          </label>
          <label>
            <span>Date Picker</span>
            <input type="date" defaultValue="2026-04-30" />
          </label>
          <label>
            <span>Time Picker</span>
            <input type="time" defaultValue="09:30" />
          </label>
          <label className="wide">
            <span>Text Area / SOAP Note</span>
            <textarea defaultValue="S: Chest tightness with exertion. O: Elevated HR and BP. A: Rule out ACS. P: Repeat ECG, trend troponin, telemetry monitoring." />
          </label>
          <label className="retro-upload">
            <Upload className="h-4 w-4" />
            <span>File Upload / Documents</span>
            <input type="file" />
          </label>
          <div className="retro-signature" aria-label="Signature pad example">
            <span>Signature Pad</span>
            <div />
          </div>
        </form>
      </Panel>

      <Panel title="Clinical Record Sections" icon={<FileArchive className="h-4 w-4" />}>
        <div className="retro-accordion">
          {['HPI', 'ROS', 'SOAP Note', 'Immunization Record'].map((section) => (
            <div key={section}>
              <button type="button" onClick={() => setAccordionOpen(section)}>
                <span>{section}</span>
                <ChevronDown className={clsx('h-4 w-4', accordionOpen === section && 'open')} />
              </button>
              {accordionOpen === section ? (
                <p>
                  {section === 'Immunization Record'
                    ? 'Tdap reviewed. Influenza pending seasonal update.'
                    : 'Structured narrative data is available for provider review and sign-off.'}
                </p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="retro-component-actions">
          <button type="button" onClick={() => setModalOpen(true)}>
            Open Modal
          </button>
          <button type="button" onClick={() => setDrawerOpen(true)}>
            Open Drawer
          </button>
          <span className="retro-tooltip">
            <MoreHorizontal className="h-4 w-4" />
            <em>Tooltip / Popover: Reviewed by clinical ops at 09:14.</em>
          </span>
        </div>
      </Panel>
    </section>
  )
}

function OrderDrawer({ onClose }: { onClose: () => void }) {
  return (
    <aside className="retro-drawer" aria-label="Slide-out order panel">
      <div className="retro-drawer-header">
        <div>
          <span>SLIDE-OUT PANEL</span>
          <h3>Pending Orders</h3>
        </div>
        <button type="button" className="retro-icon-button" onClick={onClose} aria-label="Close drawer">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="retro-drawer-list">
        <OrderItem icon={<Microscope className="h-4 w-4" />} title="Troponin repeat" detail="STAT / 10:30" />
        <OrderItem icon={<Activity className="h-4 w-4" />} title="12-lead ECG" detail="Repeat after reassessment" />
        <OrderItem icon={<Syringe className="h-4 w-4" />} title="Medication review" detail="Medication Reconciliation" />
      </div>
      <button type="button" className="retro-action-button wide">
        <Check className="h-4 w-4" />
        Sign selected
      </button>
    </aside>
  )
}

function ModalExample({ onClose }: { onClose: () => void }) {
  return (
    <div className="retro-modal-backdrop" role="presentation">
      <section className="retro-modal" role="dialog" aria-modal="true" aria-label="Order review modal">
        <div className="retro-drawer-header">
          <div>
            <span>MODAL EXAMPLE</span>
            <h3>Order Safety Check</h3>
          </div>
          <button type="button" className="retro-icon-button" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p>Penicillin allergy is active. Confirm selected orders do not conflict with documented allergies.</p>
        <div className="retro-modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary" onClick={onClose}>Confirm reviewed</button>
        </div>
      </section>
    </div>
  )
}

function Toast({ onClose }: { onClose: () => void }) {
  return (
    <div className="retro-toast" role="status">
      <Check className="h-4 w-4" />
      <span>Toast Notification: chart autosaved at 09:16</span>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string
  icon: React.ReactNode
  action?: string
  children: React.ReactNode
}) {
  return (
    <section className="retro-panel">
      <header>
        <div>
          {icon}
          <h3>{title}</h3>
        </div>
        {action ? <span>{action}</span> : null}
      </header>
      {children}
    </section>
  )
}

function ClinicalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="retro-clinical-field">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  )
}

function InfoChip({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'amber' | 'green' }) {
  return (
    <div className={clsx('retro-info-chip', tone)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'green' | 'amber' | 'red' | 'teal' }) {
  return <span className={clsx('retro-badge', tone)}>{children}</span>
}

function Progress({ value, tone }: { value: number; tone: 'green' | 'amber' | 'red' }) {
  return (
    <div className="retro-progress" aria-label={`Progress ${value}%`}>
      <span className={tone} style={{ width: `${value}%` }} />
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button type="button" className="retro-toggle-row" onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <i className={clsx(checked && 'on')} />
    </button>
  )
}

function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="retro-stepper" aria-label="Stepper form">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))}>-</button>
      <span>Step {value} of 4</span>
      <button type="button" onClick={() => onChange(Math.min(4, value + 1))}>+</button>
    </div>
  )
}

function MiniChart() {
  const bars = [34, 52, 46, 71, 58, 76, 64, 84, 69, 88]
  return (
    <div className="retro-chart" aria-label="Chart placeholder">
      {bars.map((height, index) => (
        <span key={`${height}-${index}`} style={{ height: `${height}%` }} />
      ))}
    </div>
  )
}

function OrderItem({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="retro-order-item">
      {icon}
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <Badge tone="amber">Pending</Badge>
    </div>
  )
}
