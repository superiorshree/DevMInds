/**
 * File:        extension/src/components/CompanyRepoConnectView.tsx
 * Purpose:     "Connect Your Company Repository" screen for Company Employee workflow.
 *              Allows choosing from repositories or pasting a repository URL,
 *              verifying access via live GitHub API, and continuing to onboarding.
 */

import { useEffect, useState } from "react";
import type { SessionUser } from "../services/api";
import type { RepoRef } from "../services/repoDetector";
import {
  fetchRepoDetails,
  fetchUserRepos,
  type GitHubUserRepo,
  type GitHubRepoDetails,
} from "../services/githubApi";

export interface CompanyRepoConnectViewProps {
  user: SessionUser | null;
  onBack: () => void;
  onSelectRepo: (repo: RepoRef) => void;
  onGoToIntegrations: () => void;
  onGoToSettings?: () => void;
  onSignOut: () => void;
}

export function CompanyRepoConnectView({
  user,
  onBack,
  onSelectRepo,
  onGoToIntegrations,
  onGoToSettings,
  onSignOut,
}: CompanyRepoConnectViewProps) {
  const [activeBottomNav, setActiveBottomNav] = useState<"home" | "integrations" | "settings">("home");
  const [isRepoListOpen, setIsRepoListOpen] = useState(false);
  const [userRepos, setUserRepos] = useState<GitHubUserRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pastedUrl, setPastedUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedRepo, setVerifiedRepo] = useState<RepoRef | null>(null);
  const [verifiedDetails, setVerifiedDetails] = useState<GitHubRepoDetails | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const username = user?.github_login || "Developer";
  const initial = user?.github_login ? user.github_login.charAt(0).toUpperCase() : "D";

  // Fetch live repositories available to user
  useEffect(() => {
    let active = true;
    setLoadingRepos(true);
    fetchUserRepos(user?.github_login)
      .then((repos) => {
        if (!active) return;
        setUserRepos(repos);
        if (repos.length > 0) {
          setSelectedRepoId(repos[0].id);
        }
      })
      .catch(() => {
        // Fallback to empty list so user can paste URL
        if (active) setUserRepos([]);
      })
      .finally(() => {
        if (active) setLoadingRepos(false);
      });

    return () => {
      active = false;
    };
  }, [user?.github_login]);

  // Filter repositories by search query
  const filteredRepos = userRepos.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.owner.login.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.language && r.language.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectFromList = () => {
    const chosen = userRepos.find((r) => r.id === selectedRepoId) || userRepos[0];
    if (!chosen) return;
    setIsRepoListOpen(false);
    setVerifiedRepo({ owner: chosen.owner.login, repo: chosen.name });
    setVerifiedDetails({
      owner: chosen.owner.login,
      name: chosen.name,
      full_name: chosen.full_name,
      description: chosen.description,
      language: chosen.language,
      stargazers_count: 0,
      forks_count: 0,
      open_issues_count: 0,
      topics: [],
      default_branch: chosen.default_branch,
      html_url: chosen.html_url,
      updated_at: new Date().toISOString(),
      visibility: chosen.private ? "private" : "public",
    });
    setAccessDenied(false);
    setUrlError(null);
  };

  const handleUrlChange = (val: string) => {
    setPastedUrl(val);
    setAccessDenied(false);
    setVerifiedRepo(null);
    setVerifiedDetails(null);
    if (!val.trim()) {
      setUrlError(null);
      return;
    }
    // Basic validation check
    if (!val.startsWith("https://github.com/") || val.split("/").filter(Boolean).length < 4) {
      setUrlError("Please enter a valid GitHub repository URL.");
    } else {
      setUrlError(null);
    }
  };

  const handleVerifyUrl = async () => {
    if (!pastedUrl.trim()) return;
    if (urlError) return;

    const parts = pastedUrl.replace("https://github.com/", "").split("/").filter(Boolean);
    if (parts.length < 2) {
      setUrlError("Please enter a valid GitHub repository URL.");
      return;
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");

    setIsVerifying(true);
    setAccessDenied(false);
    setVerifiedRepo(null);
    setVerifiedDetails(null);

    try {
      const details = await fetchRepoDetails(owner, repo);
      setVerifiedRepo({ owner: details.owner, repo: details.name });
      setVerifiedDetails(details);
    } catch {
      setAccessDenied(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinueOnboarding = () => {
    if (verifiedRepo) {
      onSelectRepo(verifiedRepo);
    } else {
      setUrlError("Please verify a repository URL or select one from the list.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#faf7f2",
        color: "#18181b",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          borderBottom: "1px solid #e5e0d8",
          backgroundColor: "#faf7f2",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Logo */}
          <div
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: "#18181b",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#f59e0b",
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontWeight: 800,
                fontSize: "13px",
                lineHeight: 1,
              }}
            >
              &gt;_
            </span>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "17px",
              letterSpacing: "-0.01em",
              color: "#18181b",
            }}
          >
            DevMinds
          </span>

          {/* Company Employee pill badge */}
          <div
            style={{
              backgroundColor: "#fef3c7",
              border: "1px solid #f59e0b",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "10px",
              fontWeight: 800,
              color: "#92400e",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Company Employee
          </div>
        </div>

        {/* Profile Avatar with dropdown */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="User account menu"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
            }}
          >
            <div
              style={{
                width: "27px",
                height: "27px",
                borderRadius: "50%",
                backgroundColor: "#18181b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "12px",
                overflow: "hidden",
              }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.github_login}
                  width={27}
                  height={27}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                initial
              )}
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#18181b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "36px",
                right: 0,
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "8px",
                boxShadow: "3px 3px 0px #000000",
                width: "168px",
                zIndex: 50,
                padding: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  padding: "6px 8px",
                  borderBottom: "1px solid #f3f4f6",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                @{username}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px",
                  marginTop: "4px",
                  border: "none",
                  background: "transparent",
                  color: "#dc2626",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: "4px",
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ padding: "16px 18px 80px 18px", flex: 1 }}>
        {/* Back Arrow Button */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
            display: "flex",
            alignItems: "center",
            color: "#18181b",
            fontSize: "18px",
            marginBottom: "12px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        {/* Title & Subtitle */}
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 800,
            lineHeight: 1.2,
            color: "#111827",
            margin: "0 0 6px 0",
            letterSpacing: "-0.025em",
          }}
        >
          Connect Your Company Repository
        </h1>
        <p
          style={{
            fontSize: "13.5px",
            lineHeight: 1.45,
            color: "#4b5563",
            margin: "0 0 18px 0",
          }}
        >
          Analyze repositories you have permission to access.
        </p>

        {/* Main Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1.5px solid #27272a",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          {/* Card Header row with Octocat icon */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#18181b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017C2 16.446 4.87 20.198 8.84 21.523C9.34 21.616 9.52 21.306 9.52 21.042C9.52 20.806 9.51 20.007 9.51 19.167C6.73 19.771 6.14 17.828 6.14 17.828C5.68 16.671 5.03 16.362 5.03 16.362C4.12 15.742 5.1 15.755 5.1 15.755C6.1 15.827 6.63 16.786 6.63 16.786C7.52 18.318 8.97 17.876 9.54 17.62C9.63 16.974 9.89 16.531 10.17 16.279C7.95 16.027 5.62 15.166 5.62 11.332C5.62 10.239 6.01 9.348 6.66 8.649C6.55 8.398 6.21 7.378 6.76 6.002C6.76 6.002 7.6 5.733 9.51 7.027C10.31 6.804 11.16 6.693 12 6.689C12.84 6.693 13.69 6.804 14.49 7.027C16.4 5.733 17.24 6.002 17.24 6.002C17.79 7.378 17.45 8.398 17.34 8.649C17.99 9.348 18.38 10.239 18.38 11.332C18.38 15.176 16.04 16.024 13.82 16.271C14.18 16.582 14.5 17.2 14.5 18.156C14.5 19.525 14.49 20.627 14.49 20.963C14.49 21.229 14.67 21.545 15.18 21.444C19.14 20.111 22 16.416 22 12.017C22 6.484 17.522 2 12 2Z"
                  fill="#ffffff"
                />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "14.5px", color: "#111827", lineHeight: 1.25 }}>
                Connect your company repository
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                Analyze repositories you have permission to access.
              </div>
            </div>
          </div>

          {/* GitHub Account section */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "#6b7280",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              GITHUB ACCOUNT
            </div>

            {/* Connected Account Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  ✓
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "12.5px", color: "#111827" }}>
                    GitHub connected
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#6b7280" }}>{username}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "12px",
                  }}
                >
                  Connected
                </span>
              </div>
            </div>
          </div>

          {/* Option 1: Select from my repositories */}
          {!isRepoListOpen && !verifiedRepo && (
            <button
              type="button"
              onClick={() => setIsRepoListOpen(true)}
              onMouseEnter={() => setHoveredButton("select_repo")}
              onMouseLeave={() => setHoveredButton(null)}
              style={{
                width: "100%",
                padding: "11px 14px",
                backgroundColor: "#f79f24",
                color: "#000000",
                border: "2px solid #000000",
                borderRadius: "8px",
                boxShadow:
                  hoveredButton === "select_repo"
                    ? "3.5px 3.5px 0px #000000"
                    : "2px 2px 0px #000000",
                transform:
                  hoveredButton === "select_repo" ? "translate(-1px, -1px)" : "translate(0, 0)",
                fontWeight: 700,
                fontSize: "13.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.12s ease",
                marginBottom: "16px",
              }}
            >
              <span>Select from my repositories</span>
              <span>→</span>
            </button>
          )}

          {/* Repo Selection List Dropdown */}
          {isRepoListOpen && (
            <div
              style={{
                border: "1.5px solid #27272a",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "16px",
                backgroundColor: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <span>Select a repository ({userRepos.length} available)</span>
                <span style={{ cursor: "pointer" }} onClick={() => setIsRepoListOpen(false)}>
                  ▲
                </span>
              </div>

              {/* Search input */}
              <div style={{ position: "relative", marginBottom: "10px" }}>
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px 7px 28px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Repos list */}
              {loadingRepos ? (
                <div style={{ padding: "14px", textAlign: "center", color: "#6b7280", fontSize: "12px" }}>
                  Fetching repositories from GitHub...
                </div>
              ) : filteredRepos.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "190px", overflowY: "auto" }}>
                  {filteredRepos.map((r) => {
                    const isSelected = selectedRepoId === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRepoId(r.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          backgroundColor: isSelected ? "#fef3c7" : "#ffffff",
                          border: isSelected ? "1.5px solid #f59e0b" : "1px solid #f3f4f6",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedRepoId(r.id)}
                            style={{ accentColor: "#f59e0b" }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "12.5px", color: "#111827" }}>
                              {r.owner.login} / {r.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>
                              {r.language || "Plain"} • {r.default_branch}
                            </div>
                          </div>
                        </div>
                        <span style={{ color: "#9ca3af", fontSize: "13px" }}>›</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "14px", textAlign: "center", color: "#6b7280", fontSize: "12px" }}>
                  No repositories found. You can paste a repository URL below.
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsRepoListOpen(false)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSelectFromList}
                  disabled={filteredRepos.length === 0}
                  style={{
                    flex: 1.5,
                    padding: "8px",
                    backgroundColor: filteredRepos.length === 0 ? "#e5e7eb" : "#f79f24",
                    color: filteredRepos.length === 0 ? "#9ca3af" : "#000000",
                    border: filteredRepos.length === 0 ? "1px solid #d1d5db" : "1.5px solid #000000",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: filteredRepos.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  Select Repository
                </button>
              </div>
            </div>
          )}

          {/* OR PASTE REPOSITORY URL Section */}
          {!isRepoListOpen && !verifiedRepo && (
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#6b7280",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                OR PASTE REPOSITORY URL
              </div>

              <div style={{ position: "relative", marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="https://github.com/company/repository"
                  value={pastedUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 32px 9px 12px",
                    border: urlError ? "1.5px solid #ef4444" : "1.5px solid #27272a",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    outline: "none",
                    boxSizing: "border-box",
                    backgroundColor: "#ffffff",
                  }}
                />
                {pastedUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPastedUrl("");
                      setUrlError(null);
                    }}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "9px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      fontSize: "12px",
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {urlError && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#dc2626", fontSize: "11.5px", marginBottom: "12px" }}>
                  <span>⊘</span>
                  <span>{urlError}</span>
                </div>
              )}

              {/* Verify and Analyze Button */}
              <button
                type="button"
                disabled={!pastedUrl.trim() || !!urlError || isVerifying}
                onClick={handleVerifyUrl}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  backgroundColor: !pastedUrl.trim() || !!urlError ? "#e5e7eb" : "#f79f24",
                  color: !pastedUrl.trim() || !!urlError ? "#9ca3af" : "#000000",
                  border: !pastedUrl.trim() || !!urlError ? "1px solid #d1d5db" : "2px solid #000000",
                  borderRadius: "8px",
                  boxShadow:
                    !pastedUrl.trim() || !!urlError ? "none" : "2px 2px 0px #000000",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: !pastedUrl.trim() || !!urlError ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  transition: "all 0.12s ease",
                }}
              >
                {isVerifying ? (
                  <span>Verifying live repository on GitHub...</span>
                ) : (
                  <>
                    <span>Verify and Analyze Repository</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* Access Denied error box */}
              {accessDenied && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1.5px solid #f87171",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#b91c1c", fontWeight: 700, fontSize: "12px", marginBottom: "4px" }}>
                    <span>⊘</span>
                    <span>Repository not found or access denied</span>
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#7f1d1d", lineHeight: 1.4 }}>
                    Please check the repository URL and ensure it exists and you have access permissions on GitHub.
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", color: "#6b7280" }}>
                <span>ⓘ</span>
                <span>We check directly with GitHub API whether the repository exists and is accessible.</span>
              </div>
            </div>
          )}

          {/* Verified Repository Success Box */}
          {verifiedRepo && (
            <div>
              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontWeight: 700, fontSize: "13px", marginBottom: "3px" }}>
                  <span>✓</span>
                  <span>Repository access verified live!</span>
                </div>
                <div style={{ fontSize: "12px", color: "#15803d" }}>
                  You can now continue with the onboarding process.
                </div>
              </div>

              {/* Selected Repository Card details */}
              <div
                style={{
                  border: "1.5px solid #27272a",
                  borderRadius: "8px",
                  padding: "14px",
                  marginBottom: "16px",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", marginBottom: "8px" }}>
                  Selected Repository
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontWeight: 800, fontSize: "15px", color: "#111827" }}>
                    {verifiedRepo.owner} / {verifiedRepo.repo}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                    <span>Language</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>
                      {verifiedDetails?.language || "Detected from repo"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                    <span>Default branch</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>
                      {verifiedDetails?.default_branch || "main"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                    <span>Owner</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>
                      {verifiedRepo.owner}
                    </span>
                  </div>
                </div>
              </div>

              {/* Continue to Onboarding Button */}
              <button
                type="button"
                onClick={handleContinueOnboarding}
                onMouseEnter={() => setHoveredButton("continue_onboarding")}
                onMouseLeave={() => setHoveredButton(null)}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  backgroundColor: "#f79f24",
                  color: "#000000",
                  border: "2px solid #000000",
                  borderRadius: "8px",
                  boxShadow:
                    hoveredButton === "continue_onboarding"
                      ? "4px 4px 0px #000000"
                      : "2.5px 2.5px 0px #000000",
                  transform:
                    hoveredButton === "continue_onboarding" ? "translate(-1px, -1px)" : "translate(0, 0)",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.12s ease",
                }}
              >
                <span>Continue to Onboarding</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#ffffff",
          borderTop: "1.5px solid #27272a",
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 0 10px 0",
          zIndex: 20,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveBottomNav("home")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            color: activeBottomNav === "home" ? "#f59e0b" : "#6b7280",
            fontSize: "10.5px",
            fontWeight: 700,
          }}
        >
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveBottomNav("integrations");
            onGoToIntegrations();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            color: activeBottomNav === "integrations" ? "#f59e0b" : "#6b7280",
            fontSize: "10.5px",
            fontWeight: 700,
          }}
        >
          <span>Integrations</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveBottomNav("settings");
            onGoToSettings?.();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            color: activeBottomNav === "settings" ? "#f59e0b" : "#6b7280",
            fontSize: "10.5px",
            fontWeight: 700,
          }}
        >
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}
