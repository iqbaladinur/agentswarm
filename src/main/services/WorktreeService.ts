import simpleGit from 'simple-git'
import path from 'path'
import fs from 'fs'

export class WorktreeService {
  async createWorktree(repoPath: string, branch: string, worktreePath: string): Promise<void> {
    const git = simpleGit(repoPath)

    fs.mkdirSync(path.dirname(worktreePath), { recursive: true })

    // Ensure HEAD is valid — repo needs at least one commit for worktree add
    const hasCommits = await git.raw(['rev-parse', '--verify', 'HEAD']).then(() => true).catch(() => false)
    if (!hasCommits) {
      await git.raw(['commit', '--allow-empty', '-m', 'init'])
    }

    await git.raw(['worktree', 'add', '-b', branch, worktreePath, 'HEAD'])
  }

  async removeWorktree(repoPath: string, worktreePath: string): Promise<void> {
    const git = simpleGit(repoPath)
    await git.raw(['worktree', 'remove', '--force', worktreePath])
  }

  async isGitRepo(dirPath: string): Promise<boolean> {
    try {
      const git = simpleGit(dirPath)
      await git.status()
      return true
    } catch {
      return false
    }
  }

  async getMainBranch(repoPath: string): Promise<string> {
    const git = simpleGit(repoPath)
    const result = await git.raw(['symbolic-ref', '--short', 'HEAD'])
    return result.trim()
  }
}
