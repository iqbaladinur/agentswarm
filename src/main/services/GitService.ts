import simpleGit from 'simple-git'
import type { Commit, FileStatus } from '../../shared/ipc-types'

export class GitService {
  async getLog(worktreePath: string, baseBranch = 'main'): Promise<Commit[]> {
    const git = simpleGit(worktreePath)

    // Get current branch name
    const currentBranch = (await git.raw(['symbolic-ref', '--short', 'HEAD'])).trim()

    // Commits in this branch not yet in baseBranch
    let range = `${baseBranch}..${currentBranch}`

    try {
      const log = await git.log({
        from: baseBranch,
        to: currentBranch,
        '--': undefined,
      })

      return log.all.map((c) => ({
        hash: c.hash,
        message: c.message,
        author: c.author_name,
        date: c.date,
        refs: c.refs,
      }))
    } catch {
      // Fallback: just show last 20 commits
      const log = await git.log({ maxCount: 20 })
      return log.all.map((c) => ({
        hash: c.hash,
        message: c.message,
        author: c.author_name,
        date: c.date,
        refs: c.refs,
      }))
    }
  }

  async getDiff(worktreePath: string, commitHash: string): Promise<string> {
    const git = simpleGit(worktreePath)
    return git.show([commitHash, '--stat', '--patch'])
  }

  async getFiles(worktreePath: string): Promise<FileStatus[]> {
    const git = simpleGit(worktreePath)
    const status = await git.status()

    const files: FileStatus[] = []

    for (const f of status.modified) files.push({ path: f, status: 'M' })
    for (const f of status.created) files.push({ path: f, status: 'A' })
    for (const f of status.deleted) files.push({ path: f, status: 'D' })
    for (const f of status.not_added) files.push({ path: f, status: '?' })
    for (const f of status.renamed) files.push({ path: f.to, status: 'R' })

    return files
  }

  async mergeToMain(worktreePath: string, branch: string, targetBranch = 'main'): Promise<void> {
    // Merge is done on the main repo, not the worktree
    const git = simpleGit(worktreePath)
    await git.checkout(targetBranch)
    await git.merge([branch])
    await git.checkout(branch)
  }
}
