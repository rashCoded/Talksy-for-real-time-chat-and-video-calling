"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Mail, KeyRound, RefreshCw } from "lucide-react"

function ForgotPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [step, setStep] = useState<'email' | 'reset'>('email')
    const [email, setEmail] = useState("")
    const [otp, setOtp] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)

    useEffect(() => {
        const emailParam = searchParams.get("email")
        if (emailParam) {
            setEmail(emailParam)
            setStep('reset')
        }
    }, [searchParams])

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    const handleSendOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()

        if (!email) {
            toast.error("Email required", { description: "Please enter your email address" })
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('http://localhost:8080/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send reset email')
            }

            toast.success("Code sent!", { description: "Check your email for the 6-digit code" })
            setStep('reset')
            setResendCooldown(60)
        } catch (error: any) {
            console.error('Forgot password error:', error)
            toast.error("Request failed", { description: error.message || "Please try again" })
        } finally {
            setIsLoading(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!otp || !newPassword) {
            toast.error("Missing fields", { description: "Please fill in all fields" })
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error("Password mismatch", { description: "Passwords do not match" })
            return
        }

        if (newPassword.length < 6) {
            toast.error("Weak password", { description: "Password must be at least 6 characters" })
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('http://localhost:8080/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Reset failed')
            }

            toast.success("Password reset!", { description: "You can now login with your new password" })
            router.push("/login")
        } catch (error: any) {
            console.error('Reset password error:', error)
            toast.error("Reset failed", { description: error.message || "Invalid or expired code" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm">
            <CardHeader className="space-y-3 text-center pb-6">
                <div className="flex justify-center mb-2">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                        {step === 'email' ? <Mail className="h-7 w-7 text-primary-foreground" /> : <KeyRound className="h-7 w-7 text-primary-foreground" />}
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold">
                    {step === 'email' ? 'Forgot Password?' : 'Reset Password'}
                </CardTitle>
                <CardDescription>
                    {step === 'email'
                        ? "Enter your email and we'll send you a reset code"
                        : `Enter the code sent to ${email}`}
                </CardDescription>
            </CardHeader>

            <CardContent>
                {step === 'email' ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11 bg-background/50"
                            />
                        </div>
                        <Button type="submit" className="w-full h-11" disabled={isLoading}>
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                            ) : (
                                "Send Reset Code"
                            )}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">Verification Code</Label>
                            <Input
                                id="otp"
                                type="text"
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                required
                                maxLength={6}
                                className="h-11 bg-background/50 text-center text-xl tracking-[0.5em] font-mono"
                            />
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSendOtp()}
                                    disabled={isLoading || resendCooldown > 0}
                                    className="text-xs"
                                >
                                    <RefreshCw className="mr-1 h-3 w-3" />
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="h-11 bg-background/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="h-11 bg-background/50"
                            />
                        </div>
                        <Button type="submit" className="w-full h-11" disabled={isLoading}>
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting...</>
                            ) : (
                                "Reset Password"
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full"
                            onClick={() => { setStep('email'); setOtp(''); setNewPassword(''); setConfirmPassword('') }}
                        >
                            Change Email
                        </Button>
                    </form>
                )}
            </CardContent>

            <CardFooter className="justify-center pt-2">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                </Link>
            </CardFooter>
        </Card>
    )
}

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8">
            <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <ForgotPasswordContent />
            </Suspense>
        </div>
    )
}
