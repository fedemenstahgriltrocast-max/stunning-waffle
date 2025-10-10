# Compliance Control Map

| Framework | Control | Layer | Implementation Notes |
|-----------|---------|-------|-----------------------|
| NIST CSF | ID.AM-1 | All | Inventory maintained via IaC manifests and Git tags. |
| NIST CSF | PR.AC-3 | 2,6,7 | Zero Trust policies enforce least privilege. |
| NIST CSF | DE.CM-7 | 2,3,7 | SIEM ingest from firewall, deep-analysis, backbone logs. |
| NIST CSF | RS.MI-1 | 2,3 | Automated isolation and forensics runbooks. |
| NIST CSF | RC.CO-3 | 7 | R2/Governance ledger retains audit artifacts. |
| PCI DSS 4.0 | Req. 3 | 1,5,6 | Encrypt stored data using AES-256 in R2/D1. |
| PCI DSS 4.0 | Req. 6 | 1-7 | CI/CD pipeline enforces secure development lifecycle. |
| PCI DSS 4.0 | Req. 10 | 2,6,7 | Logging and monitoring documented in this directory. |
| Cyber Essentials | Continuous Monitoring | 2,3,7 | Alerts forwarded to SOC for review. |
