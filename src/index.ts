import {
    TypeTimeStamp,
    TTypeTimeStamp,
    TimeUnit,
    TTimeUnit,
    ISOStringFormat,
    TISOStringFormat,
    TimeZone,
    TTimeZone,
} from "./types/enums";
import { timeZoneMappings } from "./types/records";
import { mapFromSeconds, mapToSeconds } from "./helpers/coefficients";

export { TypeTimeStamp , TimeUnit, ISOStringFormat, TimeZone};

/**
 * Represents a specific point in time, referred to as an epoch.
 * The epoch is stored internally as a number with a unit of time.
 *
 * @class
 * @param {number} val - The numeric value of the time.
 * @param {TypeTimeStamp} [unit=TypeTimeStamp.Second] - The unit of time for the value provided.
 *        The default unit is seconds if not specified.
 *
 * @example
 * // Create an Epoch instance representing 5000 milliseconds
 * const epochMillis = new Epoch(5000, TypeTimeStamp.Millisecond);
 *
 * @example
 * // Create an Epoch instance with the default unit of seconds
 * const epochSeconds = new Epoch(60);
 */
export class Epoch {
    val: number;
    readonly unit: TTypeTimeStamp;

    constructor(val: number, unit?: TTypeTimeStamp) {
        this.val = val;
        this.unit = unit ?? TypeTimeStamp.Second;
    }

    seconds(): number {
        return this.val * mapToSeconds.get(this.unit)!;
    }

    milliseconds(): number {
        return this.seconds() * mapFromSeconds.get(TypeTimeStamp.Millisecond)!;
    }

    microseconds(): number {
        return this.seconds() * mapFromSeconds.get(TypeTimeStamp.Microsecond)!;
    }

    date(): Date {
        return new Date(this.milliseconds());
    }

    /**
     * Calculates the difference between two Epoch instances and returns the difference
     * in the unit of the current Epoch instance.
     *
     * @param {Epoch} epoch - The Epoch instance to compare with.
     * @returns {number} - The difference in the current Epoch's unit.
     */
    diff(epoch: Epoch): number {
        // First, convert both Epoch instances to seconds
        const currentEpochInSeconds = this.val * (mapToSeconds.get(this.unit) || 1);
        const otherEpochInSeconds = epoch.val * (mapToSeconds.get(epoch.unit) || 1);
        // Calculate the difference in seconds
        const differenceInSeconds = currentEpochInSeconds - otherEpochInSeconds;
        // Convert the difference back to the current Epoch's unit
        return differenceInSeconds * (mapFromSeconds.get(this.unit) || 1);
    }

    /**
     * Indicates whether the current Epoch instance is within the range defined by the timeline.
     *
     * @param {Epoch[]} timeline An array of Epoch instances that define a range of time.
     *                           The first element is considered the start of the range, and
     *                           the last element is considered the end of the range. The array
     *                           must contain at least two Epoch instances.
     * @returns {boolean} True if the current Epoch instance is within the inclusive range defined
     *                    by the timeline; otherwise, false.
     * @throws {Error} Throws an error if the timeline array does not contain at least two Epoch instances.
     */
    in(epochArray: Array<Epoch>): boolean {
        if (epochArray.length < 2) {
            throw new RangeError(
                "Timeline array must contain at least two Epoch instances to define a range."
            );
        }

        const thisEpochInSeconds = this.seconds();
        const startEpochInSeconds = epochArray[0].seconds();
        const endEpochInSeconds = epochArray[epochArray.length - 1].seconds();

        return (
            thisEpochInSeconds >= startEpochInSeconds &&
            thisEpochInSeconds <= endEpochInSeconds
        );
    }

    add(epoch: Epoch): void {
        // Convert both epochs to seconds and add them
        const thisEpochInSeconds = this.seconds();
        const otherEpochInSeconds = epoch.seconds();
        const resultInSeconds = thisEpochInSeconds + otherEpochInSeconds;

        // Convert the result back to the original unit and update this.val
        this.val = resultInSeconds / (mapToSeconds.get(this.unit) || 1);
    }

    subtract(epoch: Epoch): void {
        // Convert both epochs to seconds and subtract them
        const thisEpochInSeconds = this.seconds();
        const otherEpochInSeconds = epoch.seconds();
        const resultInSeconds = thisEpochInSeconds - otherEpochInSeconds;

        // Convert the result back to the original unit and update this.val
        this.val = resultInSeconds / (mapToSeconds.get(this.unit) || 1);
    }

    isDst(timezone: TTimeZone): boolean {
        //check that timezone is a valid timezone
        if (!(Object.values(TimeZone).includes(timezone))) {
            throw new Error("Invalid timezone");
        }
        // Time zones that do not observe DST
        if (timezone === TimeZone.HAST || timezone === TimeZone.GST) {
            return false;
        }

        const year = this.date().getFullYear();  

        // US rules for DST
        const dstStartUS = new Date(Date.UTC(year, 2, 14, 2 + timezone, 0, 0)); // Second Sunday in March
        dstStartUS.setUTCDate(14 - (dstStartUS.getUTCDay() + 1) % 7);
        const dstEndUS = new Date(Date.UTC(year, 10, 7, 2 + timezone, 0, 0)); // First Sunday in November
        dstEndUS.setUTCDate(7 - (dstEndUS.getUTCDay() + 1) % 7);

        // UK rules for DST
        const dstStartUK = new Date(Date.UTC(year, 2, 31, 1, 0, 0)); // Last Sunday in March
        dstStartUK.setUTCDate(31 - dstStartUK.getUTCDay());
        const dstEndUK = new Date(Date.UTC(year, 9, 31, 1, 0, 0)); // Last Sunday in October
        dstEndUK.setUTCDate(31 - dstEndUK.getUTCDay());

        if (timezone === TimeZone.GMT) {
            // UK time zone
            return this.date() >= dstStartUK && this.date() < dstEndUK;
        } else {
            // US time zones
            return this.date() >= dstStartUS && this.date() < dstEndUS;
        }
    }
}


/**
 * Represents a time bound event.
 * The event is is bracketed by Epoch objects on each end, and has the ability to store event info via the metaData parameter. 
 *
 * @class
 * @param {Epoch} start - Event beginning as an Epoch.
 * @param {Epoch} end - Event end as an Epoch.
 * @param {any} metaData - Used to store any other information regarding the event.
 *
 * @example
 * // Create a TimedEvent instance beginning at 01 Jan 2020 00:00:00 UTC with a duration of 1 hour
 * const epoch1 = new Epoch(1577836800);
 * const epoch2 = new Epoch(1577840400);
 * const event = new TimedEvent(epoch1, epoch2);
 *
 * @example
 * // Create a TimedEvent instance with event metadata
 * const epoch1 = new Epoch(1577836800);
 * const epoch2 = new Epoch(1577840400);
 * const data = {
 *  category: "delivery",
 *  destination: "ABC Corp"
 * };
 * const event = new TimedEvent(epoch1, epoch2, data);
 */
export class TimedEvent {
    start: Epoch
    end: Epoch
    metaData: any

    constructor(start: Epoch | number, end: Epoch | number, metaData?: any) {
        this.start = ( start instanceof Epoch) ? start : new Epoch(start);
        this.end = ( end instanceof Epoch) ? end : new Epoch(end);
        this.metaData = metaData;

        if (this.start.seconds() > this.end.seconds()) throw new RangeError(
            "Event cannot end before it starts."
        )  
    }

    duration(): number {
        return this.end.diff(this.start)
    }
}

export class TimeLine {
    events: Array<TimedEvent>
    private sortingBy: "start" | "end" | "duration" | null;
    private sortingOrder: "asc" | "desc" | null;

    constructor(events: Array<TimedEvent>) {
        this.events = events
        this.sortingBy = null;
        this.sortingOrder = null;
    }

    private setSortingState(by: "start" | "end" | "duration" | null = null, order: "asc" | "desc" | null = null): void {
        this.sortingBy = by;
        this.sortingOrder = order;
    }

    protected compareEventStartTime(event1: TimedEvent, event2: TimedEvent): number {
        return event1.start.seconds() - event2.start.seconds()
    }

    protected compareEventEndTime(event1: TimedEvent, event2: TimedEvent): number {
        return event1.end.seconds() - event2.end.seconds()
    }

    getSortingState(): { by: "start" | "end" | "duration" |null; order: "asc" | "desc" | null } {
        return {
            by: this.sortingBy,
            order: this.sortingOrder
        };
    }    

    sort(asc: boolean = true, comparison: "start" | "end" | "duration" = "start"): void {
        //sort by start
        if (comparison === "start") {
            this.events.sort((a, b) => (asc ? 1 : -1) * this.compareEventStartTime(a, b));
            this.setSortingState("start", asc ? "asc" : "desc");
        }
        //sort by end
        else if (comparison === "end") {
            this.events.sort((a, b) => (asc ? 1 : -1) * this.compareEventEndTime(a, b));
            this.setSortingState("end", asc ? "asc" : "desc");
        }
        //sort by duration
        else if (comparison === "duration") {
            this.events.sort((a, b) => (asc ? 1 : -1) * (a.end.seconds() - a.start.seconds() - (b.end.seconds() - b.start.seconds())));
            this.setSortingState("duration", asc ? "asc" : "desc");
        }
    }

    push(event: TimedEvent, direction: "left" | "right" = "right"): void {
            (direction === "left") ? this.events.unshift(event) : this.events.push(event);    
    }


    insert(event: TimedEvent, index: number = 0): void {
        //TODO refactor to BST
        //if there is index, insert there
        if (index) {
            this.events.splice(index, 0, event);
        }
        //test if TimeLine is ascending or descending and what it is sorted by and insert accordingly in correct order
        else if (this.sortingOrder && this.sortingBy) {
            if (this.sortingOrder === "asc") {
                if (this.sortingBy === "start") {
                    let i = 0;
                    while (i < this.events.length && this.compareEventStartTime(this.events[i], event) <= 0) {
                        i++;
                    }
                    this.events.splice(i, 0, event);
                }
                else if (this.sortingBy === "end") {
                    let i = 0;
                    while (i < this.events.length && this.compareEventEndTime(this.events[i], event) <= 0) {
                        i++;
                    }
                    this.events.splice(i, 0, event);
                }
            }
            else if (this.sortingOrder === "desc") {
                if (this.sortingBy === "start") {
                    let i = 0;
                    while (i < this.events.length && this.compareEventStartTime(this.events[i], event) >= 0) {
                        i++;
                    }
                    this.events.splice(i, 0, event);
                }
                else if (this.sortingBy === "end") {
                    let i = 0;
                    while (i < this.events.length && this.compareEventEndTime(this.events[i], event) >= 0) {
                        i++;
                    }
                    this.events.splice(i, 0, event);
                }
            }
        }
        else {
            //if there is no sorting, insert at the beginning
            this.events.unshift(event);
        }
    }
    
    pop(direction: "left" | "right" = "right"): TimedEvent {
        //TODO implement rpop and lpop
        let event = (direction === "left") ? this.events.shift() : this.events.pop();
        return event!;
    }


    mask(tl: TimeLine): void {
        //TODO implement timeline intersection. mask or intersection.
        //Example I have a timeline denoting work tasks over multiple days, and a timeline denoting hours of operation. I would like to mask the array so it shows as tasks during hours of operation.
        //tasks that are split will share the same metadata
        //
    }
}