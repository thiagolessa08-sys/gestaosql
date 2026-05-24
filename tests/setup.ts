// Global test setup

// Provide a dummy Resend API key so the email client module can be imported
// without throwing during unit tests (the actual client is mocked in tests
// that send email; this just prevents top-level instantiation errors).
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_test_dummy"
