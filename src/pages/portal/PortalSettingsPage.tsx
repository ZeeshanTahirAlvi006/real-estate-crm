import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  UserCircleIcon,
  ShieldCheckIcon,
  KeyIcon,
  HomeModernIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGetLeadPortalQuery, useUpdateLeadPortalProfileMutation } from '@/store/api/dashboardApi'
import { useChangePasswordMutation } from '@/store/api/authApi'
import { useAppSelector } from '@/store/hooks'
import { toast } from 'sonner'

const PROPERTY_TYPE_OPTIONS = [
  'Luxury Villa',
  'Apartment / Flat',
  'Residential Plot',
  'Commercial Space',
  'Single Family Home',
  'Penthouse',
  'Townhouse',
]

export function PortalSettingsPage() {
  const user = useAppSelector((state) => state.auth.user)
  const { data: portalData } = useGetLeadPortalQuery()
  const [updateProfile, { isLoading: isSavingProfile }] = useUpdateLeadPortalProfileMutation()
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation()

  // Profile Form State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [secondaryPhone, setSecondaryPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')

  // Preferences State
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [isOptedOut, setIsOptedOut] = useState(false)

  // Password State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Sync state from portal data
  useEffect(() => {
    if (portalData?.contactProfile) {
      const p = portalData.contactProfile
      setFirstName(p.firstName || user?.firstName || '')
      setLastName(p.lastName || user?.lastName || '')
      setPhone(p.phone || user?.phone || '')
      setSecondaryPhone(p.secondaryPhone || '')
      setAddress(p.address || '')
      setCity(p.city || '')
      setState(p.state || '')
      setZipCode(p.zipCode || '')
      setSelectedTypes(p.propertyInterests || [])
      setIsOptedOut(p.dncStatus === 'opted_out')
    } else if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setPhone(user.phone || '')
    }
  }, [portalData, user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile({
        firstName,
        lastName,
        phone,
        secondaryPhone,
        address,
        city,
        state,
        zipCode,
      }).unwrap()
      toast.success('Your profile details have been saved successfully!')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update profile')
    }
  }

  const handleToggleConsent = async () => {
    const nextStatus = isOptedOut ? 'clean' : 'opted_out'
    try {
      await updateProfile({ dncStatus: nextStatus }).unwrap()
      setIsOptedOut(!isOptedOut)
      if (nextStatus === 'opted_out') {
        toast.info('You have opted out of automated alerts and messages.')
      } else {
        toast.success('You have successfully opted in to property matches & updates!')
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update consent preferences')
    }
  }

  const togglePropertyType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleSavePropertyPreferences = async () => {
    try {
      await updateProfile({ propertyInterests: selectedTypes }).unwrap()
      toast.success('Property search preferences updated!')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update preferences')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }
    try {
      await changePassword({ currentPassword, newPassword }).unwrap()
      toast.success('Password updated successfully! Please use your new password next time.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update password. Verify your current password.')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              to="/portal"
              className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              <span>Back to Client Journey</span>
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Settings</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>Portal Settings & Preferences</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your personal contact info, communication consent, search interests, and account security.
          </p>
        </div>

        <Link to="/portal">
          <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5 shadow-xs">
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Button>
        </Link>
      </div>

      {/* Main Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border border-border/80 rounded-xl grid grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="profile" className="gap-2 text-xs py-2">
            <UserCircleIcon className="w-4 h-4" />
            <span>Personal Profile</span>
          </TabsTrigger>
          <TabsTrigger value="consent" className="gap-2 text-xs py-2">
            <ShieldCheckIcon className="w-4 h-4" />
            <span>Messaging & TCPA</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2 text-xs py-2">
            <HomeModernIcon className="w-4 h-4" />
            <span>Search Interests</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 text-xs py-2">
            <KeyIcon className="w-4 h-4" />
            <span>Security & Login</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Personal Profile */}
        <TabsContent value="profile">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCircleIcon className="w-5 h-5 text-primary" />
                <span>Your Contact Details</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Keep your information current so your property advisor can reach you with urgent tour offers and contracts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-semibold">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">Registered Email (Read Only)</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        value={portalData?.contactProfile?.email || user?.email || ''}
                        disabled
                        className="text-xs h-9 bg-muted text-muted-foreground pl-8 font-mono"
                      />
                      <EnvelopeIcon className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">Primary WhatsApp / Mobile</Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+92 300 1234567"
                        className="text-xs h-9 pl-8"
                      />
                      <PhoneIcon className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="secondaryPhone" className="text-xs font-semibold">Secondary Phone (Optional)</Label>
                    <Input
                      id="secondaryPhone"
                      value={secondaryPhone}
                      onChange={(e) => setSecondaryPhone(e.target.value)}
                      placeholder="Home or work number"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs font-semibold">Current Mailing Address</Label>
                    <div className="relative">
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House / Apartment #, Street"
                        className="text-xs h-9 pl-8"
                      />
                      <MapPinIcon className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 md:col-span-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs font-semibold">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Lahore, Karachi"
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="state" className="text-xs font-semibold">State / Province</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Punjab, Sindh"
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="zipCode" className="text-xs font-semibold">Postal Code</Label>
                      <Input
                        id="zipCode"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="54000"
                        className="text-xs h-9 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    className="font-bold text-xs gap-1.5 h-9"
                  >
                    <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Messaging & TCPA Consent */}
        <TabsContent value="consent">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
                    <span>Communication & TCPA Consent Preferences</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    You have 100% control over how we communicate with you.
                  </CardDescription>
                </div>
                <Badge
                  variant={isOptedOut ? 'destructive' : 'default'}
                  className="text-xs font-bold"
                >
                  {isOptedOut ? 'Opted Out' : 'Active Opt-In'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 leading-relaxed">
                <p className="font-semibold text-foreground">What does this setting control?</p>
                <p className="text-muted-foreground">
                  By opting in, you grant permission for your assigned real estate advisor and PropPulse to send you real-time property match notifications, tour confirmations, and closing escrow updates via WhatsApp, SMS, and Email.
                </p>
                <p className="text-muted-foreground">
                  You can opt out at any time here or by replying <strong>STOP</strong> to any incoming text.
                </p>
                {portalData?.contactProfile?.optedOutAt && (
                  <p className="text-[11px] text-rose-500 font-mono pt-1">
                    Status logged at: {new Date(portalData.contactProfile.optedOutAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card">
                <div>
                  <p className="font-bold text-foreground text-sm">Automated Messaging Status</p>
                  <p className="text-xs text-muted-foreground">
                    {isOptedOut
                      ? 'You are currently opted out. No automated notifications will be dispatched.'
                      : 'You are opted in to receive instant property matches and escrow alerts.'}
                  </p>
                </div>
                <Button
                  variant={isOptedOut ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={handleToggleConsent}
                  className="font-semibold text-xs gap-1.5 shrink-0"
                >
                  {isOptedOut ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                      <span>Opt In to Property Updates</span>
                    </>
                  ) : (
                    <>
                      <NoSymbolIcon className="w-4 h-4 text-rose-500" />
                      <span>Opt Out of Automated Alerts</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Search Interests */}
        <TabsContent value="search">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <HomeModernIcon className="w-5 h-5 text-primary" />
                <span>Property Search Criteria</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select the types of properties you are actively seeking so your advisor can prioritize matches for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Interested Property Categories</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PROPERTY_TYPE_OPTIONS.map((type) => {
                    const isSelected = selectedTypes.includes(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => togglePropertyType(type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                          }`}
                      >
                        {isSelected ? `✓ ${type}` : `+ ${type}`}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <Button
                  onClick={handleSavePropertyPreferences}
                  className="font-bold text-xs gap-1.5 h-9"
                >
                  <SparklesIcon className="w-4 h-4" />
                  <span>Update Search Preferences</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Security & Password */}
        <TabsContent value="security">
          <Card className="border-border/80 shadow-xs max-w-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <KeyIcon className="w-5 h-5 text-primary" />
                <span>Change Your Login Password</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Update your portal password to keep your property contracts and documents secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword" className="text-xs font-semibold">
                    Current Password (or Temporary Password)
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-semibold">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 characters with 1 number & 1 special char"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat new password"
                    className="text-xs h-9"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="font-bold text-xs gap-1.5 h-9"
                  >
                    <span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
