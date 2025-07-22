# Agent Tasks Workflow / Агентские задачи

## Overview / Краткое описание

This document describes how agents should create and execute tasks when a user explicitly requests an agent task.

Note that phases can be executed by different agents.

---

**Russian:**

Документ описывает каким образом агенты должны ставить задачи и выполнять их если пользователь попросил явно сделать агентскую задачу.

Нужно учесть, что фазы могут выполняться разными агентами.

---

## How It Works / Принцип работы

### Creating a Task / Создание задачи

When a user asks to create an agent task, you need to:

1. Create a subfolder in root directory `agent-tasks` with the task name and a `phases` subfolder
2. Add to the task folder a markdown document `AGENT_TASK_SUMMARY.md`
3. Add to `AGENT_TASK_SUMMARY.md` a link to [AGENT_TASKS.md](../../../spec/AGENT_TASKS.md) with instruction to always check requirements when executing each phase
4. Conduct detailed code repository research, after which:
   - Write in `AGENT_TASK_SUMMARY.md` a detailed task execution plan, broken down by phases, plus task context, with code fragments if necessary
5. Description of each phase should be in the form of a task statement with specific code improvements
6. Break down phases so that after executing each intermediate phase, the application builds and works correctly
7. Don't make phases too large where the agent would have to change more than 15 files. Break large phases into smaller ones in this case. If there are similar changes, break large phases into smaller ones by features

---

**Russian:**

Когда пользователь просит создать агентскую задачу, необходимо:

1. Создать папку задачи в корневой директории `agent-tasks` с названием задачи и подпапку `phases`
2. Добавить в папку задачи документ `.md` `AGENT_TASK_SUMMARY.md`
3. Добавить в `AGENT_TASK_SUMMARY.md` ссылку на [AGENT_TASKS.md](../../../spec/AGENT_TASKS.md) с инструкцией, что нужно обязательно сверяться с требованиями при выполнении каждой из фаз
4. Провести детальное исследование кода репозитория, по результатам чего:
   - Записать в `AGENT_TASK_SUMMARY.md` подробный план выполнения задачи, разбитый по фазам, а также контекст задачи, при необходимости - с фрагментами кода
5. Описание каждой из фаз должно быть в виде постановки задачи с конкретными доработками кода
6. Разбивай фазы таким образом, чтобы после выполнения каждой промежуточной фазы приложение собиралось и работало корректно
7. Не делай слишком больших фаз, в которых агенту придется изменять более 15 файлов. Разбивай в этом случае фазы на более мелкие. Если есть однотипные изменения, разбивай крупные фазы на более мелкие по фичам

---

### Executing a Task Phase / Выполнение фазы задачи

When a user asks to execute a task phase, you need to:

1. Find the corresponding task folder
2. Analyze `AGENT_TASK_SUMMARY.md`
3. Analyze the scope of planned changes, if there are too many (e.g., more than 10 files are changed), break the phase into smaller ones, modify the phase list in `AGENT_TASK_SUMMARY.md` and execute the first of the phases you broke the current large phase into
4. Execute the task phase, add to `/phases/phase_[number]_summary.md` a description of what was completed and new context for future phases
5. Enrich `AGENT_TASK_SUMMARY.md`, indicate in the completed phase section status "Completed", add necessary context obtained during phase implementation
6. If necessary, adjust the list of future phases

---

**Russian:**

Когда пользователь просит выполнить фазу задачи, необходимо:

1. Найти соответствующую папку с задачей
2. Проанализировать `AGENT_TASK_SUMMARY.md`
3. Проанализировать объем планируемых изменений, если их очень много (например, изменяется больше 10 файлов), разбей фазу на более мелкие, измени список фаз в `AGENT_TASK_SUMMARY.md` и выполни первую из фаз, на которые ты разбил текущую крупную фазу
4. Выполнить фазу задачи, добавить в `/phases/phase_[number]_summary.md` описание того, что было выполнено и новый контекст для будущих фаз
5. Обогатить `AGENT_TASK_SUMMARY.md`, указать в разделе выполненной фазы статус "Выполнено", добавить необходимый контекст, который был получен в рамках реализации фазы
6. При необходимости скорректировать список будущих фаз

---

### Executing the Final Phase / Выполнение последней фазы

When an agent executes the final phase, it forms a summary from `AGENT_TASK_SUMMARY.md` and all files in `/phases` of what was done and writes the summary to `[task folder]/TASK_COMPLETION_REPORT.md`

---

**Russian:**

Когда агент выполняет последнюю фазу, он формирует сводку из `AGENT_TASK_SUMMARY.md` и всех файлов в `/phases` что было сделано и записывает сводку в `[папка с задачей]/TASK_COMPLETION_REPORT.md`

---

## Notes / Примечания

**English:**
- When forming the list of phases and their descriptions, it's necessary to describe planned actions in detail, as different agents may not understand the context very well
- During analysis, it's necessary to check against [design principles](../../architecture/design-principles.md)
- After executing each phase, add a link to the phase md file in `AGENT_TASK_SUMMARY.md`

**Russian:**
- При формировании списка фаз и их описания необходимо подробно описывать планируемые действия, так как разные агенты могут не очень хорошо понимать контекст
- При анализе необходимо сверяться с [принципами архитектуры](../../architecture/design-principles.md)
- После выполнения каждой из фаз добавляй в `AGENT_TASK_SUMMARY.md` ссылку на md файл фазы

## Related Files / Связанные файлы

- [Design Principles](../../architecture/design-principles.md) - Architecture guidelines
- [LLM Integration](../../features/ai-integration/llm-integration.md) - AI agent integration
