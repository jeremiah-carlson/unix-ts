import { Epoch, TimedEvent, TimeLine } from "../../src/index";

const ts_start = 1577836800; // 01 Jan 2020 00:00:00 UTC
const event_arr = [
    {start: ts_start + 20_000, end: ts_start + 40_000, sort_index_start: 2, sort_index_end: 2},
    {start: ts_start + 0, end: ts_start + 15_000, sort_index_start: 0, sort_index_end: 0},
    {start: ts_start + 35_000, end: ts_start + 500_000, sort_index_start: 3, sort_index_end: 4},
    {start: ts_start + 200_000, end: ts_start + 400_000, sort_index_start: 4, sort_index_end: 3},
    {start: ts_start + 15_000, end: ts_start + 33_000, sort_index_start: 1, sort_index_end: 1},
];

let gen_arr = ()=>{
    return event_arr.map((e)=>{
        let start = new Epoch(e.start);
        let end = new Epoch(e.end);

        return new TimedEvent(start, end, {sort_index_start: e.sort_index_start, sort_index_end: e.sort_index_end})
    })
};


test('Test sort asc', ()=>{
    // Sort by start time
    let t1 = new TimeLine(gen_arr());
    expect(t1.events[0].metaData.sort_index_start).toBe(2);
    t1.sort();
    let si = -1;
    t1.events.forEach((event: TimedEvent) => {
       expect(event.metaData.sort_index_start).toBeGreaterThan(si);
       si = event.metaData.sort_index_start;
    });

    // Sort by end time
    t1.sort(true, "end");
    si = -1;
    t1.events.forEach((event: TimedEvent) => {
        expect(event.metaData.sort_index_end).toBeGreaterThan(si);
        si = event.metaData.sort_index_end;
     });
})

test('Test sort desc', ()=>{
    // Sort by start time
    let t1 = new TimeLine(gen_arr());
    expect(t1.events[0].metaData.sort_index_start).toBe(2);
    t1.sort(false);
    let si = 100;
    t1.events.forEach((event: TimedEvent) => {
       expect(event.metaData.sort_index_start).toBeLessThan(si);
       si = event.metaData.sort_index_start;
    });

    // Sort by end time
    t1.sort(false, "end");
    si = 100;
    t1.events.forEach((event: TimedEvent) => {
       expect(event.metaData.sort_index_end).toBeLessThan(si);
       si = event.metaData.sort_index_end;
    });
})

test('insert method should correctly insert an event into the timeline', () => {
    // Initialize timeline with events
    let t1 = new TimeLine(gen_arr());
    
    // Create a new event to insert
    let newEvent = new TimedEvent(new Epoch(ts_start + 10_000), new Epoch(ts_start + 20_000), {sort_index_start: 1.5, sort_index_end: 1.5});

    // Insert new event
    t1.insert(newEvent);
    
    // After insertion, the new event should be at index 2
    expect(t1.events[2]).toBe(newEvent);
});

test('pop method should remove the last or first event from the timeline', () => {
    // Initialize timeline with events
    let t1 = new TimeLine(gen_arr());
    
    // Test pop with default direction (right)
    let rightPop = t1.pop();
    // The event that was popped should have sort_index_start of 4 (the last one)
    expect(rightPop.metaData.sort_index_start).toBe(4);

    // Reset and test pop with direction left
    t1 = new TimeLine(gen_arr());
    let leftPop = t1.pop('left');
    // The event that was popped should have sort_index_start of 0 (the first one)
    expect(leftPop.metaData.sort_index_start).toBe(0);
});

test('push method should add an event to the correct end of the timeline based on direction', () => {
    // Initialize timeline with events
    let t1 = new TimeLine(gen_arr());
    
    // Create new events to push
    let newEventRight = new TimedEvent(new Epoch(ts_start + 500_000), new Epoch(ts_start + 600_000), {sort_index_start: 5, sort_index_end: 5});
    let newEventLeft = new TimedEvent(new Epoch(ts_start - 100_000), new Epoch(ts_start), {sort_index_start: 0, sort_index_end: 0});

    // Push new event to the right
    t1.push(newEventRight, 'right');
    // The new event should be the last one in the timeline
    expect(t1.events[t1.events.length - 1]).toBe(newEventRight);

    // Push new event to the left
    t1.push(newEventLeft, 'left');
    // The new event should be the first one in the timeline
    expect(t1.events[0]).toBe(newEventLeft);
});
